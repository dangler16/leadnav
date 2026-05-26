'use client'

import { useState } from 'react'
import { Lead, CallOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { logCall as logCallAction } from './actions'

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

type Props = {
  lead: Lead
  userId: string
}

export function LeadActions({ lead, userId: _userId }: Props) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<CallOutcome>('no_answer')
  const [notes, setNotes] = useState('')

  async function logCall(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const loggedOutcome = outcome
    const loggedNotes = notes

    setNotes('')
    setOutcome('no_answer')
    setOpen(false)
    await logCallAction(lead.id, loggedOutcome, loggedNotes || null)
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="border-0"
      >
        Log Call
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Log a Call</DialogTitle>
          </DialogHeader>
          <form onSubmit={logCall} className="space-y-4 mt-2">
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
              <Label htmlFor="call-notes">Notes</Label>
              <Textarea
                id="call-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes…"
                rows={3}
                className="text-xs resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex items-center gap-2">
                Log Call
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
