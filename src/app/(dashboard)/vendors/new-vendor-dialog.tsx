'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { uploadVendorLogo } from './actions'
import { LogoCropUpload } from '../teams/logo-crop-upload'

const LEAD_TYPES = ['ACA', 'Medicare']

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' }, { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' }, { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' }, { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' }, { abbr: 'HI', name: 'Hawaii' }, { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' }, { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' }, { abbr: 'KY', name: 'Kentucky' }, { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' }, { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' }, { abbr: 'MN', name: 'Minnesota' }, { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' }, { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' }, { abbr: 'NH', name: 'New Hampshire' }, { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' }, { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' }, { abbr: 'OH', name: 'Ohio' }, { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' }, { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' }, { abbr: 'SD', name: 'South Dakota' }, { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' }, { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' }, { abbr: 'WA', name: 'Washington' }, { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' },
]

function formatCurrency(raw: string): string {
  if (!raw) return '$'
  const n = parseInt(raw)
  return isNaN(n) ? '$' : '$' + n.toLocaleString('en-US')
}

export function NewVendorDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorType, setVendorType] = useState<'inbound' | 'manual'>('inbound')
  const [checkedTypes, setCheckedTypes] = useState<Set<string>>(new Set())
  const [typeCosts, setTypeCosts] = useState<Record<string, string>>({})
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set())
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null)
  const [cropKey, setCropKey] = useState(0)
  const costRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const router = useRouter()
  const supabase = createClient()

  function toggleType(lt: string) {
    setCheckedTypes(prev => {
      const next = new Set(prev)
      next.has(lt) ? next.delete(lt) : next.add(lt)
      return next
    })
  }

  function handleCostChange(lt: string, e: React.ChangeEvent<HTMLInputElement>) {
    const selStart = e.target.selectionStart ?? 0
    const digitsBeforeCursor = e.target.value.slice(0, selStart).replace(/\D/g, '').length
    const digits = e.target.value.replace(/\D/g, '')
    setTypeCosts(prev => ({ ...prev, [lt]: digits }))
    const newFormatted = formatCurrency(digits)
    requestAnimationFrame(() => {
      const input = costRefs.current[lt]
      if (!input) return
      if (digitsBeforeCursor === 0) { input.setSelectionRange(1, 1); return }
      let digitCount = 0
      let newCursor = newFormatted.length
      for (let i = 0; i < newFormatted.length; i++) {
        if (/\d/.test(newFormatted[i])) {
          digitCount++
          if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break }
        }
      }
      input.setSelectionRange(newCursor, newCursor)
    })
  }

  function toggleState(abbr: string) {
    setSelectedStates(prev => {
      const next = new Set(prev)
      next.has(abbr) ? next.delete(abbr) : next.add(abbr)
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

  function reset() {
    setVendorType('inbound')
    setCheckedTypes(new Set())
    setTypeCosts({})
    setSelectedStates(new Set())
    setLogoBlob(null)
    setCropKey(k => k + 1)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const lead_types = Array.from(checkedTypes)
    const lead_type_costs: Record<string, number> = {}
    for (const lt of lead_types) {
      const val = typeCosts[lt]
      if (val) lead_type_costs[lt] = parseInt(val)
    }

    try {
      let logo_url: string | null = null
      if (logoBlob) {
        const ext = logoBlob.type === 'image/svg+xml' ? 'svg' : 'png'
        const uploadFd = new FormData()
        uploadFd.set('file', new File([logoBlob], `logo.${ext}`, { type: logoBlob.type }))
        logo_url = await uploadVendorLogo(uploadFd)
      }

      const { error: err } = await supabase.from('vendors').insert({
        name: fd.get('name') as string,
        type: fd.get('type') as 'inbound' | 'manual',
        lead_types,
        lead_type_costs,
        locations: Array.from(selectedStates),
        cost_per_lead: null,
        logo_url,
      })

      if (err) { setError('Failed to add vendor. Please try again.'); return }
      setOpen(false)
      reset()
      router.refresh()
    } catch {
      setError('Failed to add vendor. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const allSelected = selectedStates.size === US_STATES.length

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Add Vendor
      </Button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); if (!val) reset() }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. MediaAlpha" required />
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <LogoCropUpload key={cropKey} currentUrl={null} onBlobChange={setLogoBlob} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <SelectDropdown
                options={[{ value: 'inbound', label: 'Inbound (webhook)' }, { value: 'manual', label: 'Manual' }]}
                value={vendorType}
                onChange={v => setVendorType(v as 'inbound' | 'manual')}
                name="type"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lead Types & Cost</Label>
              <div className="space-y-2">
                {LEAD_TYPES.map(lt => (
                  <div key={lt} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs cursor-pointer w-24 shrink-0">
                      <input
                        type="checkbox"
                        checked={checkedTypes.has(lt)}
                        onChange={() => toggleType(lt)}
                        className="rounded"
                      />
                      {lt}
                    </label>
                    {checkedTypes.has(lt) && (
                      <Input
                        ref={el => { costRefs.current[lt] = el }}
                        value={formatCurrency(typeCosts[lt] ?? '')}
                        onChange={e => handleCostChange(lt, e)}
                        inputMode="numeric"
                        placeholder="$0"
                        className="flex-1 h-8 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
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
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); reset() }}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Vendor'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
