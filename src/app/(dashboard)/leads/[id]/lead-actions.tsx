'use client'

import { useState, useCallback } from 'react'
import { Lead, CallOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { logCall as logCallAction } from './actions'
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
  dialerPreference: string
}

export function LeadActions({ lead, userId, dialerPreference }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<CallOutcome>('no_answer')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState(0)
  const [endedBy, setEndedBy] = useState('')
  const [recordingFile, setRecordingFile] = useState<File | null>(null)

  const handleDurationChange = useCallback((s: number) => setDuration(s), [])

  function handleDial() {
    if (lead.phone) {
      window.location.href = buildDialerUrl(lead.phone, dialerPreference)
    }
    setOpen(true)
  }

  async function handleLogDial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const loggedOutcome = outcome
    const loggedNotes = notes
    const loggedEndedBy = endedBy || null
    const loggedDuration = duration > 0 ? duration : null
    const fileToUpload = recordingFile

    setNotes('')
    setOutcome('no_answer')
    setEndedBy('')
    setDuration(0)
    setRecordingFile(null)
    setOpen(false)

    let recordingUrl: string | null = null
    if (fileToUpload) {
      const ext = fileToUpload.name.split('.').pop() ?? 'mp3'
      const path = `${userId}/${Date.now()}.${ext}`
      const { data } = await supabase.storage.from('call-recordings').upload(path, fileToUpload)
      if (data) {
        recordingUrl = supabase.storage.from('call-recordings').getPublicUrl(data.path).data.publicUrl
      }
    }

    await logCallAction(lead.id, loggedOutcome, loggedNotes || null, loggedDuration, loggedEndedBy, recordingUrl)
  }

  return (
    <>
      <Button onClick={handleDial} size="sm" className="border-0">
        Dial
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
                onChange={v => setOutcome(v as CallOutcome)}
                buttonClassName=""
              />
            </div>

            <div className="space-y-1.5">
              <Label>Who ended the call?</Label>
              <SelectDropdown
                options={endedByOptions}
                value={endedBy}
                onChange={setEndedBy}
              />
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
                    accept="audio/*,.mp3,.wav,.m4a,.ogg"
                    className="hidden"
                    onChange={e => setRecordingFile(e.target.files?.[0] ?? null)}
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
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Log Dial</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
