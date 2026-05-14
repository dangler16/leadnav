'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { DisputeStatus } from '@/lib/types'

export async function updateDisputeStatus(disputeId: string, status: DisputeStatus) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'team_admin')) throw new Error('Unauthorized')

  const service = createServiceClient()

  // Team admins can only update disputes for their team's members
  if (profile.role === 'team_admin') {
    const { data: assignments } = await service
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', user.id)
    const myTeamIds = (assignments ?? []).map((a: { team_id: string }) => a.team_id)

    const { data: members } = await service
      .from('team_members')
      .select('user_id')
      .in('team_id', myTeamIds.length > 0 ? myTeamIds : ['00000000-0000-0000-0000-000000000000'])
    const myMemberIds = new Set((members ?? []).map((m: { user_id: string }) => m.user_id))

    const { data: dispute } = await service.from('disputes').select('agent_id').eq('id', disputeId).single()
    if (!dispute || !myMemberIds.has(dispute.agent_id)) throw new Error('Unauthorized')
  }

  const { error } = await service.from('disputes').update({ status }).eq('id', disputeId)
  if (error) throw new Error('Failed to update dispute status')

  revalidatePath('/disputes')
}
