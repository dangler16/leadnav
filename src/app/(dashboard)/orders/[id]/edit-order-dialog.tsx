'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, Vendor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'

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

export function EditOrderDialog({ order, vendor }: { order: Order; vendor: Vendor | null }) {
  const initialBudgetDigits = order.daily_budget?.toString() ?? ''
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedLeadTypes, setSelectedLeadTypes] = useState<Set<string>>(new Set(order.lead_types))
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set(order.states))
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(order.availability))
  const [budgetDigits, setBudgetDigits] = useState(initialBudgetDigits)
  const budgetRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const vendorLeadTypes = vendor?.lead_types ?? []
  const leadTypeOptions = Array.from(new Set([...vendorLeadTypes, ...order.lead_types]))

  function toggleLeadType(lt: string) {
    setSelectedLeadTypes(prev => {
      const next = new Set(prev)
      next.has(lt) ? next.delete(lt) : next.add(lt)
      return next
    })
  }

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
    setSelectedLeadTypes(new Set(order.lead_types))
    setSelectedStates(new Set(order.states))
    setSelectedDays(new Set(order.availability))
    setBudgetDigits(initialBudgetDigits)
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) reset()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('orders').update({
      lead_types: Array.from(selectedLeadTypes),
      daily_budget: budgetDigits ? parseInt(budgetDigits) : null,
      states: Array.from(selectedStates),
      availability: Array.from(selectedDays),
    }).eq('id', order.id)
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  const allSelected = selectedStates.size === US_STATES.length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors px-1.5 py-1 rounded hover:bg-gray-100"
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

            {/* Lead Types */}
            <div className="space-y-2">
              <Label>Lead Types</Label>
              {leadTypeOptions.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">No lead types configured for this vendor</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {leadTypeOptions.map(lt => {
                    const checked = selectedLeadTypes.has(lt)
                    const cost = vendor?.lead_type_costs?.[lt] ?? vendor?.cost_per_lead
                    return (
                      <button
                        key={lt}
                        type="button"
                        onClick={() => toggleLeadType(lt)}
                        className={`flex flex-col items-center text-sm px-2.5 py-1.5 rounded-sm transition-colors font-medium leading-tight ${
                          checked
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>{lt}</span>
                        {cost != null && (
                          <span className={`transition-colors text-xs mt-1 font-normal ${checked ? 'text-red-100' : 'text-gray-500'}`}>
                            ${cost.toLocaleString('en-US')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

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
                  className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="border border-gray-200 rounded-md p-2 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-3 gap-1">
                  {US_STATES.map(({ abbr, name }) => {
                    const checked = selectedStates.has(abbr)
                    return (
                      <button
                        key={abbr}
                        type="button"
                        onClick={() => toggleState(abbr)}
                        className={`text-sm px-2 py-1.5 rounded-sm transition-colors text-left leading-none ${
                          checked
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              </div>
              {selectedStates.size > 0 && (
                <p className="text-sm text-gray-400 leading-relaxed">
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
                      className={`text-sm w-full py-1.5 rounded-sm transition-colors font-medium ${
                        checked
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
