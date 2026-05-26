'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { TeamBillingMode } from '@/lib/types'

export async function updateDarkMode(dark: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('profiles').update({ dark_mode: dark }).eq('id', user.id)

  const jar = await cookies()
  jar.set('theme', dark ? 'dark' : 'light', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  })
}

export async function updateDialerPreference(preference: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('profiles').update({ dialer_preference: preference }).eq('id', user.id)
}

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
