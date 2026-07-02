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

type ServiceClient = ReturnType<typeof createServiceClient>

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

async function requireLeadAccess(service: ServiceClient, userId: string, leadId: string) {
  const { data: lead } = await service
    .from('leads')
    .select('assigned_to')
    .eq('id', leadId)
    .single()

  if (!lead) throw new Error('Lead not found')
  if (lead.assigned_to === userId) return

  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (profile?.role === 'super_admin') return
  if (profile?.role !== 'team_admin' || !lead.assigned_to) throw new Error('Unauthorized')

  const { data: assignments } = await service
    .from('team_admin_assignments')
    .select('team_id')
    .eq('user_id', userId)

  const teamIds = (assignments ?? []).map(assignment => assignment.team_id)
  if (teamIds.length === 0) throw new Error('Unauthorized')

  const { data: membership } = await service
    .from('team_members')
    .select('user_id')
    .eq('user_id', lead.assigned_to)
    .in('team_id', teamIds)
    .maybeSingle()

  if (!membership) throw new Error('Unauthorized')
}

export async function createCallRecordingUpload(
  leadId: string,
  fileName: string,
  contentType: string,
  fileSize: number,
): Promise<{ path: string; uploadKey: string; publicUrl: string }> {
  const user = await requireUser()
  const service = createServiceClient()
  await requireLeadAccess(service, user.id, leadId)

  const extension = (fileName.split('.').pop() ?? '').toLowerCase()
  if (!Number.isFinite(fileSize) || fileSize <= 0) throw new Error('A recording file is required')
  if (fileSize > MAX_RECORDING_BYTES) throw new Error('Recording must be 25 MB or smaller')
  if (!contentType.startsWith('audio/') || !ALLOWED_RECORDING_EXTENSIONS.has(extension)) {
    throw new Error('Recording must be MP3, WAV, M4A, OGG, or WebM audio')
  }

  const path = `${user.id}/${crypto.randomUUID()}.${extension}`
  const { data, error } = await service.storage
    .from('call-recordings')
    .createSignedUploadUrl(path)

  if (error || !data?.token) throw new Error('Failed to authorize recording upload')

  return {
    path: data.path ?? path,
    uploadKey: data.token,
    publicUrl: service.storage.from('call-recordings').getPublicUrl(path).data.publicUrl,
  }
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
  await requireLeadAccess(service, user.id, leadId)

  const newStatus = outcomeToStatus[outcome]
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
