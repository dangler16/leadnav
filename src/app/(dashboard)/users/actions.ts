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

export async function updateUser(
  userId: string,
  fields: { firstName: string; lastName: string; email: string; role: 'agent' | 'admin' }
) {
  const service = await requireAdminService()

  const [profileResult, emailResult] = await Promise.all([
    service.from('profiles').update({ first_name: fields.firstName, last_name: fields.lastName, role: fields.role }).eq('id', userId),
    service.auth.admin.updateUserById(userId, { email: fields.email }),
  ])

  if (profileResult.error) throw new Error('Failed to update profile')
  if (emailResult.error) throw new Error('Failed to update email')

  revalidatePath('/users')
}

export async function setUserTeams(userId: string, teamIds: string[]) {
  const service = await requireAdminService()

  await service.from('team_members').delete().eq('user_id', userId)

  if (teamIds.length > 0) {
    const { error } = await service.from('team_members').insert(
      teamIds.map(teamId => ({ team_id: teamId, user_id: userId, role: 'member' }))
    )
    if (error) throw new Error('Failed to update team memberships')
  }

  revalidatePath('/users')
  revalidatePath('/teams')
}
