'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

async function requireSuperAdminService() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') throw new Error('Unauthorized')
  return createServiceClient()
}

const ALLOWED_LOGO_TYPES = ['image/png', 'image/webp', 'image/svg+xml']

export async function uploadTeamLogo(formData: FormData): Promise<string> {
  const service = await requireSuperAdminService()
  const file = formData.get('file') as File
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error('Logo must be a PNG, WebP, or SVG.')
  }
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await service.storage.from('team-logos').upload(path, file, { contentType: file.type })
  if (error) throw new Error('Failed to upload logo. Please try again.')
  const { data } = service.storage.from('team-logos').getPublicUrl(path)
  return data.publicUrl
}

export async function createTeam(name: string, logoUrl: string | null): Promise<string> {
  const service = await requireSuperAdminService()
  const { data, error } = await service.from('teams').insert({ name, logo_url: logoUrl }).select('id').single()
  if (error) throw new Error('Failed to create team')
  revalidatePath('/teams')
  return data.id
}

export async function updateTeam(id: string, name: string, logoUrl: string | null) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('teams').update({ name, logo_url: logoUrl }).eq('id', id)
  if (error) throw new Error('Failed to update team')
  revalidatePath('/teams')
}

export async function deleteTeam(id: string) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('teams').delete().eq('id', id)
  if (error) throw new Error('Failed to delete team')
  revalidatePath('/teams')
}

export async function addTeamMember(teamId: string, userId: string) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('team_members').upsert({
    team_id: teamId,
    user_id: userId,
    can_order: false,
    can_view_leads: false,
    can_make_calls: false,
    can_file_disputes: false,
  })
  if (error) throw new Error('Failed to add member')
  revalidatePath('/teams')
  revalidatePath('/users')
}

export async function removeTeamMember(teamId: string, userId: string) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
  if (error) throw new Error('Failed to remove member')
  revalidatePath('/teams')
  revalidatePath('/users')
}

export async function updateMemberPermissions(
  teamId: string,
  userId: string,
  permissions: {
    can_order: boolean
    can_view_leads: boolean
    can_make_calls: boolean
    can_file_disputes: boolean
  }
) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('team_members').update(permissions).eq('team_id', teamId).eq('user_id', userId)
  if (error) throw new Error('Failed to update permissions')
  revalidatePath('/teams')
}

export async function assignTeamAdminAndPromote(teamId: string, userId: string) {
  const service = await requireSuperAdminService()
  const { data: profile } = await service.from('profiles').select('role').eq('id', userId).single()
  if (profile?.role !== 'super_admin') {
    await service.from('profiles').update({ role: 'team_admin' }).eq('id', userId)
  }
  const { error } = await service.from('team_admin_assignments').upsert({ team_id: teamId, user_id: userId })
  if (error) throw new Error('Failed to assign team admin')
  revalidatePath('/teams')
  revalidatePath('/users')
}

export async function assignTeamAdmin(teamId: string, userId: string) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('team_admin_assignments').upsert({ team_id: teamId, user_id: userId })
  if (error) throw new Error('Failed to assign team admin')
  revalidatePath('/teams')
  revalidatePath('/users')
}

export async function removeTeamAdmin(teamId: string, userId: string) {
  const service = await requireSuperAdminService()
  const { error } = await service.from('team_admin_assignments').delete().eq('team_id', teamId).eq('user_id', userId)
  if (error) throw new Error('Failed to remove team admin')
  revalidatePath('/teams')
  revalidatePath('/users')
}
