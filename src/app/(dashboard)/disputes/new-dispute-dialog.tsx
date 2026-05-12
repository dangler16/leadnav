'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, DisputeReason } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Plus } from 'lucide-react'

const reasonOptions: { value: DisputeReason; label: string }[] = [
  { value: 'bad_phone', label: 'Bad Phone' },
  { value: 'bad_email', label: 'Bad Email' },
  { value: 'bad_address', label: 'Bad Address' },
  { value: 'duplicate', label: 'Duplicate Lead' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'other', label: 'Other' },
]

type LeadOption = Pick<Lead, 'id' | 'firstname' | 'lastname'>

export function NewDisputeDialog({ leads, userId }: { leads: LeadOption[]; userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [reason, setReason] = useState<DisputeReason>('bad_phone')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    await supabase.from('disputes').insert({
      lead_id: fd.get('lead_id') as string,
      agent_id: userId,
      reason: fd.get('reason') as DisputeReason,
      notes: fd.get('notes') || null,
      status: 'pending',
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button className="flex items-center gap-2" onClick={() => setOpen(true)}><Plus size={15} /> File Dispute</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File a Dispute</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Lead</Label>
            <SelectDropdown
              options={leads.map(l => ({ value: l.id, label: [l.firstname, l.lastname].filter(Boolean).join(' ') || l.id }))}
              value={selectedLeadId}
              onChange={setSelectedLeadId}
              name="lead_id"
              placeholder="Select lead…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <SelectDropdown
              options={reasonOptions.map(r => ({ value: r.value, label: r.label }))}
              value={reason}
              onChange={v => setReason(v as DisputeReason)}
              name="reason"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="Describe the issue…" rows={3} className="text-sm resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Filing…' : 'File Dispute'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
