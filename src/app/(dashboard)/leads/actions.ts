'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAdminProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'team_admin')) throw new Error('Unauthorized')
  return { supabase, user }
}

export async function reassignLead(leadId: string, agentId: string): Promise<void> {
  const { supabase } = await getAdminProfile()

  const { error } = await supabase
    .from('leads')
    .update({ assigned_to: agentId || null })
    .eq('id', leadId)

  if (error) throw new Error('Failed to reassign lead')

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
}

export async function reassignLeads(leadIds: string[], agentId: string): Promise<void> {
  if (leadIds.length === 0) return
  const { supabase } = await getAdminProfile()

  const { error } = await supabase
    .from('leads')
    .update({ assigned_to: agentId || null })
    .in('id', leadIds)

  if (error) throw new Error('Failed to reassign leads')

  revalidatePath('/leads')
}
