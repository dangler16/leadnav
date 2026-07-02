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

const MAX_RECORDING_BYTES = 25 * 1024 * 1024
const ALLOWED_RECORDING_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'webm'])

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function uploadCallRecording(formData: FormData): Promise<string> {
  const user = await requireUser()
  const file = formData.get('file')

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('A recording file is required')
  }

  if (file.size > MAX_RECORDING_BYTES) {
    throw new Error('Recording must be 25 MB or smaller')
  }

  const extension = (file.name.split('.').pop() ?? '').toLowerCase()
  const isAudioMime = file.type.startsWith('audio/')
  if (!isAudioMime || !ALLOWED_RECORDING_EXTENSIONS.has(extension)) {
    throw new Error('Recording must be MP3, WAV, M4A, OGG, or WebM audio')
  }

  const path = `${user.id}/${crypto.randomUUID()}.${extension}`
  const service = createServiceClient()
  const { error } = await service.storage
    .from('call-recordings')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new Error('Failed to upload recording')

  return service.storage.from('call-recordings').getPublicUrl(path).data.publicUrl
}

export async function logCall(
  leadId: string,
  outcome: CallOutcome,
  notes: string | null,
  durationSeconds?: number | null,
  endedBy?: string | null,
  recordingUrl?: string | null,
) {
  const user = await requireUser()
  const service = createServiceClient()
  const newStatus = outcomeToStatus[outcome]

  const { data: lead } = await service
    .from('leads')
    .select('assigned_to')
    .eq('id', leadId)
    .single()

  if (!lead || lead.assigned_to !== user.id) {
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'team_admin')) {
      throw new Error('Unauthorized')
    }
  }

  const [callResult, leadResult] = await Promise.all([
    service.from('call_logs').insert({
      lead_id: leadId,
      agent_id: user.id,
      outcome,
      notes: notes || null,
      duration_seconds: durationSeconds ?? null,
      ended_by: endedBy ?? null,
      recording_url: recordingUrl ?? null,
      called_at: new Date().toISOString(),
    }),
    newStatus
      ? service.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId)
      : Promise.resolve({ error: null }),
  ])

  if (callResult.error) throw new Error('Failed to log call')
  if (leadResult.error) throw new Error('Call logged, but lead status could not be updated')

  revalidatePath(`/leads/${leadId}`)
  revalidatePath('/dials')
}
