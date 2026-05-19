'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, LeadStatus, CallOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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

type Props = {
  lead: Lead
  userId: string
}

export function LeadActions({ lead, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<CallOutcome>('no_answer')
  const [notes, setNotes] = useState('')

  async function logCall(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const loggedOutcome = outcome
    const loggedNotes = notes
    const newStatus = outcomeToStatus[loggedOutcome]

    setNotes('')
    setOutcome('no_answer')
    setOpen(false)
    await Promise.all([
      supabase.from('call_logs').insert({
        lead_id: lead.id,
        agent_id: userId,
        outcome: loggedOutcome,
        notes: loggedNotes || null,
        called_at: new Date().toISOString(),
      }),
      newStatus
        ? supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', lead.id)
        : Promise.resolve(),
    ])

    router.refresh()
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-gray-900 text-white hover:bg-gray-800 border-0"
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
