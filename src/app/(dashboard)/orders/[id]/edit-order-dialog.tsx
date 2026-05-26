'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderAgent, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Pencil, UserMinus } from 'lucide-react'
import { addOrderAgent, removeOrderAgent, transferOrder } from '../actions'

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: 'AL', name: 'Alabama' },
  { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' },
  { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' },
  { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' },
  { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' },
  { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' },
  { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' },
  { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' },
  { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' },
  { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' },
  { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' },
  { abbr: 'WY', name: 'Wyoming' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatBudget(digits: string): string {
  if (!digits) return '$'
  const n = parseInt(digits)
  return isNaN(n) ? '$' : '$' + n.toLocaleString('en-US')
}

type AgentWithProfile = OrderAgent & { profile: Profile }

export function EditOrderDialog({
  order,
  agents = [],
  orderableProfiles = [],
}: {
  order: Order
  agents?: AgentWithProfile[]
  orderableProfiles?: Profile[]
}) {
  const initialBudgetDigits = order.daily_budget?.toString() ?? ''
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [agentLoading, setAgentLoading] = useState<string | null>(null)
  const [transferId, setTransferId] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set(order.states))
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(order.availability))
  const [budgetDigits, setBudgetDigits] = useState(initialBudgetDigits)
  const [addAgentId, setAddAgentId] = useState('')
  const budgetRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const assignedIds = new Set(agents.map(a => a.user_id))
  const availableToAdd = orderableProfiles.filter(p => !assignedIds.has(p.id))

  function toggleState(abbr: string) {
    setSelectedStates(prev => {
      const next = new Set(prev)
      next.has(abbr) ? next.delete(abbr) : next.add(abbr)
      return next
    })
  }

  function toggleDay(d: string) {
    setSelectedDays(prev => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  function toggleAllStates() {
    if (selectedStates.size === US_STATES.length) {
      setSelectedStates(new Set())
    } else {
      setSelectedStates(new Set(US_STATES.map(s => s.abbr)))
    }
  }

  function handleBudgetChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selStart = e.target.selectionStart ?? 0
    const digitsBeforeCursor = e.target.value.slice(0, selStart).replace(/\D/g, '').length
    const digits = e.target.value.replace(/\D/g, '')
    setBudgetDigits(digits)
    const newFormatted = formatBudget(digits)
    requestAnimationFrame(() => {
      if (!budgetRef.current) return
      if (digitsBeforeCursor === 0) { budgetRef.current.setSelectionRange(1, 1); return }
      let digitCount = 0
      let newCursor = newFormatted.length
      for (let i = 0; i < newFormatted.length; i++) {
        if (/\d/.test(newFormatted[i])) {
          digitCount++
          if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break }
        }
      }
      budgetRef.current.setSelectionRange(newCursor, newCursor)
    })
  }

  function reset() {
    setSelectedStates(new Set(order.states))
    setSelectedDays(new Set(order.availability))
    setBudgetDigits(initialBudgetDigits)
    setAddAgentId('')
    setTransferId('')
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) reset()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      await supabase.from('orders').update({
        daily_budget: budgetDigits ? parseInt(budgetDigits) : null,
        states: Array.from(selectedStates),
        availability: Array.from(selectedDays),
      }).eq('id', order.id)
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleAddAgent() {
    if (!addAgentId) return
    setAgentLoading(`add-${addAgentId}`)
    try {
      await addOrderAgent(order.id, addAgentId)
      setAddAgentId('')
      router.refresh()
    } finally {
      setAgentLoading(null)
    }
  }

  async function handleTransfer() {
    if (!transferId) return
    setTransferLoading(true)
    try {
      await transferOrder(order.id, transferId)
      setTransferId('')
      setOpen(false)
      router.refresh()
    } finally {
      setTransferLoading(false)
    }
  }

  async function handleRemoveAgent(userId: string) {
    setAgentLoading(`remove-${userId}`)
    try {
      await removeOrderAgent(order.id, userId)
      router.refresh()
    } finally {
      setAgentLoading(null)
    }
  }

  const allSelected = selectedStates.size === US_STATES.length
  const showAgents = orderableProfiles.length > 0
  const transferOptions = orderableProfiles.filter(p => p.id !== order.account_id)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted"
      >
        <Pencil size={14} />
        Edit
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">

            {/* Agents */}
            {showAgents && (
              <div className="space-y-2">
                <Label>Agents</Label>
                {agents.length > 0 && (
                  <div className="space-y-1">
                    {agents.map(a => {
                      const name = [a.profile.first_name, a.profile.last_name].filter(Boolean).join(' ') || '—'
                      return (
                        <div key={a.user_id} className="flex items-center gap-2 py-1.5 px-2 rounded border border-border bg-muted">
                          <div className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center text-muted-foreground text-[10px] font-bold flex-shrink-0">
                            {(a.profile.first_name?.[0] ?? '?').toUpperCase()}
                          </div>
                          <span className="flex-1 text-xs text-foreground">{name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAgent(a.user_id)}
                            disabled={agentLoading === `remove-${a.user_id}`}
                            className="p-0.5 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          >
                            <UserMinus size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {availableToAdd.length > 0 && (
                  <div className="flex gap-2">
                    <SelectDropdown
                      options={availableToAdd.map(p => ({
                        value: p.id,
                        label: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id,
                      }))}
                      value={addAgentId}
                      onChange={setAddAgentId}
                      placeholder="Add agent…"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddAgent}
                      disabled={!addAgentId || !!agentLoading}
                    >
                      {agentLoading?.startsWith('add') ? '…' : 'Add'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Transfer */}
            {transferOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Transfer Order</Label>
                <div className="flex gap-2">
                  <SelectDropdown
                    options={transferOptions.map(p => ({
                      value: p.id,
                      label: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id,
                    }))}
                    value={transferId}
                    onChange={setTransferId}
                    placeholder="Select agent…"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTransfer}
                    disabled={!transferId || transferLoading}
                  >
                    {transferLoading ? '…' : 'Transfer'}
                  </Button>
                </div>
              </div>
            )}

            {/* Daily Budget */}
            <div className="space-y-1.5">
              <Label>Daily Budget</Label>
              <Input
                ref={budgetRef}
                value={formatBudget(budgetDigits)}
                onChange={handleBudgetChange}
                inputMode="numeric"
                placeholder="$0"
              />
            </div>

            {/* States */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>States</Label>
                <button
                  type="button"
                  onClick={toggleAllStates}
                  className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="border border-border rounded-md p-2 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-3 gap-1">
                  {US_STATES.map(({ abbr, name }) => {
                    const checked = selectedStates.has(abbr)
                    return (
                      <button
                        key={abbr}
                        type="button"
                        onClick={() => toggleState(abbr)}
                        className={`text-xs px-2 py-1.5 rounded-sm transition-colors text-left leading-none ${
                          checked
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>
              {selectedStates.size > 0 && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {US_STATES.filter(s => selectedStates.has(s.abbr)).map(s => s.name).join(', ')}
                </p>
              )}
            </div>

            {/* Availability */}
            <div className="space-y-2 w-full">
              <Label>Availability</Label>
              <div className="flex gap-1.5 w-full">
                {DAYS.map(d => {
                  const checked = selectedDays.has(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`text-xs w-full py-1.5 rounded-sm transition-colors font-medium ${
                        checked
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
