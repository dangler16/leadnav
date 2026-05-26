'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { CallOutcome, LeadStatus } from '@/lib/types'

const outcomeToStatus: Partial<Record<CallOutcome, LeadStatus>> = {
  no_answer: 'not_contacted',
  voicemail: 'not_contacted',
  callback_requested: 'contacted',
  appointment_set: 'appt_set',
  contacted: 'contacted',
  not_interested: 'lost',
  wrong_number: 'lost',
  sale: 'sale',
}

export async function logCall(leadId: string, outcome: CallOutcome, notes: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const service = createServiceClient()
  const newStatus = outcomeToStatus[outcome]

  await Promise.all([
    service.from('call_logs').insert({
      lead_id: leadId,
      agent_id: user.id,
      outcome,
      notes: notes || null,
      called_at: new Date().toISOString(),
    }),
    newStatus
      ? service.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId)
      : Promise.resolve(),
  ])

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/calls')
}
