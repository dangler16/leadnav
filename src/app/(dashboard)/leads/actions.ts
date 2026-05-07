'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reassignLead(leadId: string, agentId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') throw new Error('Unauthorized')

  const { error } = await supabase
    .from('leads')
    .update({ assigned_to: agentId || null })
    .eq('id', leadId)

  if (error) throw new Error('Failed to reassign lead')

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/leads')
}
