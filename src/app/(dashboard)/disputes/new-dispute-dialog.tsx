'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, DisputeReason } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'

const reasonOptions: { value: DisputeReason; label: string }[] = [
  { value: 'bad_phone', label: 'Bad Phone' },
  { value: 'bad_email', label: 'Bad Email' },
  { value: 'bad_address', label: 'Bad Address' },
  { value: 'duplicate', label: 'Duplicate Lead' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'other', label: 'Other' },
]

type LeadOption = Pick<Lead, 'id' | 'firstname' | 'lastname'>

function leadLabel(l: LeadOption) {
  return [l.firstname, l.lastname].filter(Boolean).join(' ') || l.id
}

function LeadSearch({ leads, value, onChange }: { leads: LeadOption[]; value: string; onChange: (id: string) => void }) {
  const selected = leads.find(l => l.id === value)
  const [query, setQuery] = useState(selected ? leadLabel(selected) : '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? leads.filter(l => leadLabel(l).toLowerCase().includes(query.toLowerCase()))
    : leads

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!value) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  function select(lead: LeadOption) {
    onChange(lead.id)
    setQuery(leadLabel(lead))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value) onChange('')
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search leads…"
        className="text-xs"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded border border-border bg-card shadow-sm text-xs">
          {filtered.map(l => (
            <li
              key={l.id}
              onMouseDown={() => select(l)}
              className="cursor-pointer px-3 py-2 text-foreground hover:bg-muted transition-colors"
            >
              {leadLabel(l)}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
          No leads found
        </div>
      )}
    </div>
  )
}

export function NewDisputeDialog({ leads, userId }: { leads: LeadOption[]; userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [reason, setReason] = useState<DisputeReason>('bad_phone')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const selectedLead = leads.find(lead => lead.id === selectedLeadId)
    if (!selectedLead) return

    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const { data: leadOwner } = await supabase
      .from('leads')
      .select('assigned_to')
      .eq('id', selectedLead.id)
      .single()

    const { error: insertError } = await supabase.from('disputes').insert({
      lead_id: selectedLead.id,
      agent_id: leadOwner?.assigned_to ?? userId,
      reason: fd.get('reason') as DisputeReason,
      notes: fd.get('notes') || null,
      status: 'open',
    })

    setLoading(false)

    if (insertError) {
      setError('The dispute could not be filed. Please try again.')
      return
    }

    setOpen(false)
    setSelectedLeadId('')
    setReason('bad_phone')
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>File Dispute</Button>
      <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setError(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>File a Dispute</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <input type="hidden" name="lead_id" value={selectedLeadId} />
              <LeadSearch leads={leads} value={selectedLeadId} onChange={setSelectedLeadId} />
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
              <Textarea id="notes" name="notes" placeholder="Describe the issue…" rows={3} className="text-xs resize-none" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !selectedLeadId}>{loading ? 'Filing…' : 'File Dispute'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
