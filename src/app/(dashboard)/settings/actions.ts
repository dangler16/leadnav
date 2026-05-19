'use server'

import { createClient } from '@/lib/supabase/server'
import { TeamBillingMode } from '@/lib/types'

export async function updateTeamBillingMode(teamId: string, mode: TeamBillingMode) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'team_admin' && profile.role !== 'super_admin')) return

  if (profile.role === 'team_admin') {
    const { data: assignment } = await supabase
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .single()
    if (!assignment) return
  }

  await supabase.from('teams').update({ billing_mode: mode }).eq('id', teamId)
}
