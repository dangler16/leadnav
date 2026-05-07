'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

async function requireAdminService() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') throw new Error('Unauthorized')
  return createServiceClient()
}

export async function createTeam(name: string, phone: string | null, logoUrl: string | null) {
  const service = await requireAdminService()
  const { error } = await service.from('teams').insert({ name, phone, logo_url: logoUrl })
  if (error) throw new Error('Failed to create team')
  revalidatePath('/teams')
}

export async function updateTeam(id: string, name: string, phone: string | null, logoUrl: string | null) {
  const service = await requireAdminService()
  const { error } = await service.from('teams').update({ name, phone, logo_url: logoUrl }).eq('id', id)
  if (error) throw new Error('Failed to update team')
  revalidatePath('/teams')
}

export async function deleteTeam(id: string) {
  const service = await requireAdminService()
  const { error } = await service.from('teams').delete().eq('id', id)
  if (error) throw new Error('Failed to delete team')
  revalidatePath('/teams')
}

export async function addTeamMember(teamId: string, userId: string, role: 'leader' | 'member') {
  const service = await requireAdminService()
  const { error } = await service.from('team_members').upsert({ team_id: teamId, user_id: userId, role })
  if (error) throw new Error('Failed to add member')
  revalidatePath('/teams')
  revalidatePath('/users')
}

export async function removeTeamMember(teamId: string, userId: string) {
  const service = await requireAdminService()
  const { error } = await service.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId)
  if (error) throw new Error('Failed to remove member')
  revalidatePath('/teams')
  revalidatePath('/users')
}

export async function updateMemberRole(teamId: string, userId: string, role: 'leader' | 'member') {
  const service = await requireAdminService()
  const { error } = await service.from('team_members').update({ role }).eq('team_id', teamId).eq('user_id', userId)
  if (error) throw new Error('Failed to update role')
  revalidatePath('/teams')
}
