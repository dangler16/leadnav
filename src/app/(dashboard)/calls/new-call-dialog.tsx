'use client'

import { useState, useRef, useEffect } from 'react'
import { Lead, CallOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { logCall } from '../leads/[id]/actions'

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

export function NewCallDialog({ leads }: { leads: LeadOption[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [outcome, setOutcome] = useState<CallOutcome>('no_answer')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedLeadId) return
    setLoading(true)
    await logCall(selectedLeadId, outcome, notes || null)
    setLoading(false)
    setSelectedLeadId('')
    setOutcome('no_answer')
    setNotes('')
    setOpen(false)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Log Call</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log a Call</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <LeadSearch leads={leads} value={selectedLeadId} onChange={setSelectedLeadId} />
            </div>
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <SelectDropdown
                options={outcomeOptions}
                value={outcome}
                onChange={v => setOutcome(v as CallOutcome)}
                name="outcome"
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
              <Button type="submit" disabled={loading || !selectedLeadId}>
                {loading ? 'Logging…' : 'Log Call'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
