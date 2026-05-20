'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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

  const [{ error }, { data: lead }] = await Promise.all([
    supabase.from('leads').update({ assigned_to: agentId || null }).eq('id', leadId),
    supabase.from('leads').select('firstname, lastname').eq('id', leadId).single(),
  ])

  if (error) throw new Error('Failed to reassign lead')

  if (agentId) {
    const name = [lead?.firstname, lead?.lastname].filter(Boolean).join(' ') || 'New lead'
    const service = createServiceClient()
    await service.from('notifications').insert({
      user_id: agentId,
      type: 'new_lead',
      title: `New lead assigned: ${name}`,
      body: null,
      link: `/leads/${leadId}`,
      read: false,
    })
  }

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

  if (agentId) {
    const service = createServiceClient()
    if (leadIds.length === 1) {
      const { data: lead } = await supabase.from('leads').select('firstname, lastname').eq('id', leadIds[0]).single()
      const name = [lead?.firstname, lead?.lastname].filter(Boolean).join(' ') || 'New lead'
      await service.from('notifications').insert({
        user_id: agentId,
        type: 'new_lead',
        title: `New lead assigned: ${name}`,
        body: null,
        link: `/leads/${leadIds[0]}`,
        read: false,
      })
    } else {
      await service.from('notifications').insert({
        user_id: agentId,
        type: 'new_lead',
        title: `${leadIds.length} new leads assigned to you`,
        body: null,
        link: '/leads',
        read: false,
      })
    }
  }

  revalidatePath('/leads')
}
