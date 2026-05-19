'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SquareUser, Phone } from 'lucide-react'
import { LeadStatusSelect } from './lead-status-select'
import { SortableHeader, SortDir } from '@/components/sortable-header'
import { LeadStatus, Profile } from '@/lib/types'
import { reassignLeads } from './actions'
import { Button } from '@/components/ui/button'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export type FormattedLead = {
  id: string
  name: string | null
  status: LeadStatus
  vendor: string | null
  phone: string | null
  email: string | null
  state: string | null
  zip: string | null
  dateShort: string
  dateFull: string
}

const nullValue = <span className="text-gray-400 select-none">—</span>

const UNSET = '__unset__'

export function LeadsTable({
  leads,
  sort,
  sortDir,
  isAdmin,
  agents,
}: {
  leads: FormattedLead[]
  sort: string | null
  sortDir: SortDir | null
  isAdmin: boolean
  agents: Profile[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignAgentId, setReassignAgentId] = useState(UNSET)
  const [reassigning, setReassigning] = useState(false)

  const allSelected = leads.length > 0 && selected.size === leads.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map(l => l.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleReassignOpenChange(open: boolean) {
    if (open) setReassignAgentId(UNSET)
    setReassignOpen(open)
  }

  async function handleBulkReassign() {
    if (reassignAgentId === UNSET || reassigning) return
    setReassigning(true)
    try {
      await reassignLeads([...selected], reassignAgentId)
      setSelected(new Set())
      setReassignOpen(false)
      router.refresh()
    } finally {
      setReassigning(false)
    }
  }

  const colCount = isAdmin ? 10 : 9
  const agentOptions = [
    { value: '', label: 'Unassigned' },
    ...agents.map(a => ({ value: a.id, label: [a.first_name, a.last_name].filter(Boolean).join(' ') })),
  ]

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Bulk action bar — admins only, transitions in when rows are selected */}
      {isAdmin && (
        <div
          className={`grid bg-gray-900 shrink-0 transition-all duration-200 ease-in-out ${
            selected.size > 0 ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2">
              <span className="text-xs font-medium text-white">
                {selected.size} lead{selected.size !== 1 ? 's' : ''} selected
              </span>

              <Dialog open={reassignOpen} onOpenChange={handleReassignOpenChange}>
                <button
                  onClick={() => handleReassignOpenChange(true)}
                  className="text-xs font-medium text-white border border-white/25 bg-white/10 hover:bg-white/20 rounded px-2.5 py-1 transition-all"
                >
                  Reassign
                </button>
                <DialogContent className="max-w-xs" showCloseButton={false}>
                  <DialogHeader>
                    <DialogTitle>
                      Reassign {selected.size} Lead{selected.size !== 1 ? 's' : ''}
                    </DialogTitle>
                  </DialogHeader>
                  <SelectDropdown
                    options={agentOptions}
                    value={reassignAgentId === UNSET ? UNSET : reassignAgentId}
                    onChange={setReassignAgentId}
                    placeholder="Select agent…"
                  />
                  <DialogFooter showCloseButton>
                    <Button
                      onClick={handleBulkReassign}
                      disabled={reassignAgentId === UNSET || reassigning}
                    >
                      {reassigning ? 'Reassigning…' : 'Reassign'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-white/50 hover:text-white/80 transition-colors ml-auto"
              >
                Deselect all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              {isAdmin && (
                <th className="pl-2.5 w-5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    className="w-3 h-3 rounded border-gray-300 accent-gray-900 cursor-pointer"
                  />
                </th>
              )}
              <th className="text-left px-3 py-2.5"><SortableHeader column="name"   label="Lead"    currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2.5"><SortableHeader column="status" label="Status"  currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2.5"><SortableHeader column="vendor" label="Vendor"  currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2.5"><SortableHeader column="phone"  label="Phone"   currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2.5"><SortableHeader column="email"  label="Email"   currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2.5"><SortableHeader column="state"  label="State"   currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2.5"><SortableHeader column="zip"    label="Zip"     currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2.5"><SortableHeader column="date"   label="Date"    currentSort={sort} currentDir={sortDir} /></th>
              <th className="w-24 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2.5">
                    <SquareUser size={24} className="text-gray-200" strokeWidth={1.5} />
                    <p className="text-sm text-gray-400">No leads in this category</p>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map(lead => {
                const isSelected = isAdmin && selected.has(lead.id)
                return (
                  <tr
                    key={lead.id}
                    className={`group border-b border-gray-100 transition-colors ${isSelected ? 'bg-gray-100/60' : 'hover:bg-gray-50'}`}
                  >
                    {isAdmin && (
                      <td className="pl-2.5 w-5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(lead.id)}
                          className="w-3 h-3 rounded border-gray-300 accent-gray-900 cursor-pointer"
                        />
                      </td>
                    )}
                    <td className="px-3 pt-1 pb-2">
                      <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-gray-900 hover:text-gray-500 transition-colors">
                        {lead.name ?? nullValue}
                      </Link>
                    </td>
                    <td className="px-3 pt-1 pb-2">
                      <LeadStatusSelect leadId={lead.id} initialStatus={lead.status} />
                    </td>
                    <td className="px-3 py-1.5 text-sm text-gray-900 whitespace-nowrap">
                      {lead.vendor ?? nullValue}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-sm text-gray-900 whitespace-nowrap">
                      {lead.phone ?? nullValue}
                    </td>
                    <td className="px-3 py-1.5 text-sm text-gray-900 max-w-[200px] truncate">
                      {lead.email ?? nullValue}
                    </td>
                    <td className="px-3 py-1.5 text-sm text-gray-900">
                      {lead.state ?? nullValue}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-sm text-gray-900">
                      {lead.zip ?? nullValue}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-400 whitespace-nowrap" title={lead.dateFull}>
                      {lead.dateShort}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Link
                        href="/calls"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-900 border border-gray-200 bg-white rounded px-3 py-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 hover:bg-gray-50 transition-colors"
                      >
                        <Phone size={11} strokeWidth={2} />
                        Call Lead
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
