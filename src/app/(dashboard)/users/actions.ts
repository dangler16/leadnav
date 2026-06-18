'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@/lib/types'

async function getCallerProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
  if (!profile) throw new Error('Unauthorized')
  return { profile, service: createServiceClient() }
}

async function requireSuperAdminService() {
  const { profile, service } = await getCallerProfile()
  if (profile.role !== 'super_admin') throw new Error('Unauthorized')
  return service
}

async function requireSuperAdminOrTeamAdminService() {
  const { profile, service } = await getCallerProfile()
  if (profile.role !== 'super_admin' && profile.role !== 'team_admin') throw new Error('Unauthorized')
  return { profile, service }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('profiles').update({ role }).eq('id', userId)
  if (error) throw new Error('Failed to update role')
  revalidatePath('/users')
}

export async function updateUser(
  userId: string,
  fields: { firstName: string; lastName: string; email: string; role: UserRole }
) {
  const service = await requireSuperAdminService()

  const [profileResult, emailResult] = await Promise.all([
    service.from('profiles').update({ first_name: fields.firstName, last_name: fields.lastName, role: fields.role }).eq('id', userId),
    service.auth.admin.updateUserById(userId, { email: fields.email }),
  ])

  if (profileResult.error) throw new Error('Failed to update profile')
  if (emailResult.error) throw new Error('Failed to update email')

  revalidatePath('/users')
}

export async function setUserTeam(userId: string, teamId: string | null) {
  const service = await requireSuperAdminService()

  await service.from('team_members').delete().eq('user_id', userId)

  if (teamId) {
    const { error } = await service.from('team_members').insert({
      team_id: teamId,
      user_id: userId,
      can_order: false,
      can_view_leads: false,
      can_make_calls: false,
      can_file_disputes: false,
    })
    if (error) throw new Error('Failed to update team membership')
  }

  revalidatePath('/users')
  revalidatePath('/teams')
}

export async function setTeamAdminAssignments(userId: string, teamIds: string[]) {
  const service = await requireSuperAdminService()

  await service.from('team_admin_assignments').delete().eq('user_id', userId)

  if (teamIds.length > 0) {
    const { error } = await service.from('team_admin_assignments').insert(
      teamIds.map(teamId => ({ team_id: teamId, user_id: userId }))
    )
    if (error) throw new Error('Failed to update team admin assignments')
  }

  revalidatePath('/users')
  revalidatePath('/teams')
}

export async function inviteUser(fields: {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  teamId: string | null
  teamAdminTeamIds: string[]
}) {
  const { profile: caller, service } = await requireSuperAdminOrTeamAdminService()

  // Team admins can only invite regular users to their own teams
  if (caller.role === 'team_admin') {
    if (fields.role !== 'user') throw new Error('Team admins can only invite users')
    const { data: assignments } = await service
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', caller.id)
    const myTeamIds = new Set((assignments ?? []).map((a: { team_id: string }) => a.team_id))
    if (fields.teamId && !myTeamIds.has(fields.teamId)) throw new Error('Unauthorized')
  }

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: inviteData, error: inviteError } = await service.auth.admin.inviteUserByEmail(fields.email, {
    redirectTo: `${siteUrl}/auth/confirm`,
    data: {
      first_name: fields.firstName,
      last_name: fields.lastName,
      role: fields.role,
    },
  })
  if (inviteError || !inviteData?.user) throw new Error('Failed to send invite')

  const newUserId = inviteData.user.id

  if (fields.role === 'user' && fields.teamId) {
    await service.from('team_members').insert({
      team_id: fields.teamId,
      user_id: newUserId,
      can_order: false,
      can_view_leads: false,
      can_make_calls: false,
      can_file_disputes: false,
    })
  }

  if ((fields.role === 'team_admin' || fields.role === 'super_admin') && fields.teamAdminTeamIds.length > 0) {
    await service.from('team_admin_assignments').insert(
      fields.teamAdminTeamIds.map(teamId => ({ team_id: teamId, user_id: newUserId }))
    )
  }

  revalidatePath('/users')
  revalidatePath('/teams')
}

export async function updateUserPermissions(
  userId: string,
  teamId: string,
  permissions: {
    can_order: boolean
    can_view_leads: boolean
    can_make_calls: boolean
    can_file_disputes: boolean
  }
) {
  const { profile: caller, service } = await requireSuperAdminOrTeamAdminService()

  if (caller.role === 'team_admin') {
    const { data: assignments } = await service
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', caller.id)
    const myTeamIds = new Set((assignments ?? []).map((a: { team_id: string }) => a.team_id))
    if (!myTeamIds.has(teamId)) throw new Error('Unauthorized')
  }

  const { error } = await service.from('team_members').update(permissions).eq('user_id', userId).eq('team_id', teamId)
  if (error) throw new Error('Failed to update permissions')

  revalidatePath('/users')
}

export async function deleteUser(userId: string) {
  const { profile: caller, service } = await getCallerProfile()
  if (caller.role !== 'super_admin') throw new Error('Unauthorized')
  if (caller.id === userId) throw new Error('You cannot delete your own account')

  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) throw new Error('Failed to delete user')

  revalidatePath('/users')
}

export async function removeUserFromTeam(userId: string, teamId: string) {
  const { profile: caller, service } = await requireSuperAdminOrTeamAdminService()

  if (caller.role === 'team_admin') {
    const { data: assignments } = await service
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', caller.id)
    const myTeamIds = new Set((assignments ?? []).map((a: { team_id: string }) => a.team_id))
    if (!myTeamIds.has(teamId)) throw new Error('Unauthorized')
  }

  const { error } = await service.from('team_members').delete().eq('user_id', userId).eq('team_id', teamId)
  if (error) throw new Error('Failed to remove user from team')

  revalidatePath('/users')
}
