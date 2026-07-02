'use client'

import { useCallback, useMemo, useState } from 'react'
import { Lead, CallOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createCallRecordingUpload, logCall as logCallAction } from './actions'
import { createClient } from '@/lib/supabase/client'
import { Upload } from 'lucide-react'
import { CallTimer } from '@/app/(dashboard)/dials/call-timer'
import { buildDialerUrl } from '@/lib/dialer'

const outcomeOptions: { value: CallOutcome; label: string }[] = [
  { value: 'no_answer', label: 'No Answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'appointment_set', label: 'Appointment Set' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'sale', label: 'Sale' },
]

const endedByOptions = [
  { value: '', label: 'Not specified' },
  { value: 'agent', label: 'I ended the call' },
  { value: 'lead', label: 'They hung up' },
]

type Props = {
  lead: Lead
  userId: string
}

export function LeadActions({ lead }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<CallOutcome>('no_answer')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState(0)
  const [endedBy, setEndedBy] = useState('')
  const [recordingFile, setRecordingFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDurationChange = useCallback((seconds: number) => setDuration(seconds), [])

  function handleDial() {
    if (lead.phone) window.location.href = buildDialerUrl(lead.phone, 'default')
    setError(null)
    setOpen(true)
  }

  function resetForm() {
    setNotes('')
    setOutcome('no_answer')
    setEndedBy('')
    setDuration(0)
    setRecordingFile(null)
    setError(null)
  }

  async function uploadRecording(file: File): Promise<string> {
    const signedUpload = await createCallRecordingUpload(lead.id, file.name, file.type, file.size)
    const { error: uploadError } = await supabase.storage
      .from('call-recordings')
      .uploadToSignedUrl(signedUpload.path, signedUpload.uploadKey, file, {
        contentType: file.type,
      })

    if (uploadError) throw new Error('Failed to upload recording')
    return signedUpload.path
  }

  async function handleLogDial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const recordingPath = recordingFile ? await uploadRecording(recordingFile) : null
      await logCallAction(
        lead.id,
        outcome,
        notes || null,
        duration > 0 ? duration : null,
        endedBy || null,
        recordingPath,
      )
      resetForm()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The dial could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleRecordingSelection(file: File | null) {
    setError(null)
    if (!file) {
      setRecordingFile(null)
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setRecordingFile(null)
      setError('Recording must be 25 MB or smaller.')
      return
    }
    setRecordingFile(file)
  }

  return (
    <>
      <Button onClick={handleDial} size="sm" className="border-0">Dial</Button>

      <Dialog
        open={open}
        onOpenChange={value => {
          if (saving) return
          setOpen(value)
          if (!value) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Log a Dial</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogDial} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <CallTimer onDurationChange={handleDurationChange} />
            </div>

            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <SelectDropdown
                options={outcomeOptions}
                value={outcome}
                onChange={value => setOutcome(value as CallOutcome)}
                buttonClassName=""
              />
            </div>

            <div className="space-y-1.5">
              <Label>Who ended the call?</Label>
              <SelectDropdown options={endedByOptions} value={endedBy} onChange={setEndedBy} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dial-notes">Notes</Label>
              <Textarea
                id="dial-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes…"
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Recording</Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/ogg,audio/webm,.mp3,.wav,.m4a,.ogg,.webm"
                    className="hidden"
                    onChange={e => handleRecordingSelection(e.target.files?.[0] ?? null)}
                    disabled={saving}
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs border border-border bg-card hover:bg-muted rounded px-3 py-1.5 transition-colors">
                    <Upload size={12} />
                    {recordingFile ? recordingFile.name : 'Upload recording'}
                  </span>
                </label>
                {recordingFile && (
                  <button
                    type="button"
                    onClick={() => setRecordingFile(null)}
                    className="text-xs text-destructive/70 hover:text-destructive transition-colors"
                    disabled={saving}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">MP3, WAV, M4A, OGG, or WebM. Maximum 25 MB.</p>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Log Dial'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
