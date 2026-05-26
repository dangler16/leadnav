'use client'

import { useState, useRef, useEffect } from 'react'
import { Lead } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { buildDialerUrl } from '@/lib/dialer'
import { Phone } from 'lucide-react'

type LeadOption = Pick<Lead, 'id' | 'firstname' | 'lastname' | 'phone'>

function leadLabel(l: LeadOption) {
  return [l.firstname, l.lastname].filter(Boolean).join(' ') || l.id
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function MakeCallDialog({ leads, dialerPreference }: { leads: LeadOption[]; dialerPreference: string }) {
  const [open, setOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = leads.find(l => l.id === selectedLeadId)
  const filtered = query.trim()
    ? leads.filter(l => leadLabel(l).toLowerCase().includes(query.toLowerCase()))
    : leads

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        if (!selectedLeadId) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selectedLeadId])

  function select(lead: LeadOption) {
    setSelectedLeadId(lead.id)
    setQuery(leadLabel(lead))
    setDropdownOpen(false)
  }

  function handleCall() {
    if (!selected?.phone) return
    window.location.href = buildDialerUrl(selected.phone, dialerPreference)
    handleOpenChange(false)
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setSelectedLeadId('')
      setQuery('')
      setDropdownOpen(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Make Call</Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Make a Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">

            <div className="space-y-1.5">
              <Label>Lead</Label>
              <div ref={containerRef} className="relative">
                <Input
                  value={query}
                  onChange={e => {
                    setQuery(e.target.value)
                    setDropdownOpen(true)
                    if (!e.target.value) setSelectedLeadId('')
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder="Search leads…"
                  className="text-xs"
                  autoComplete="off"
                />
                {dropdownOpen && filtered.length > 0 && (
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
                {dropdownOpen && query.trim() && filtered.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
                    No leads found
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                <Phone size={13} className="text-muted-foreground shrink-0" />
                {selected.phone ? (
                  <span className="text-xs text-foreground">{formatPhone(selected.phone)}</span>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No phone on file</span>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="button" onClick={handleCall} disabled={!selected?.phone}>
                Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
