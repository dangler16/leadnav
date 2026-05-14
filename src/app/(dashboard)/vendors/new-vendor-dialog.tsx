'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Plus } from 'lucide-react'

const LEAD_TYPES = ['ACA', 'Medicare']

export function NewVendorDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vendorType, setVendorType] = useState<'inbound' | 'manual'>('inbound')
  const [checkedTypes, setCheckedTypes] = useState<Set<string>>(new Set())
  const [typeCosts, setTypeCosts] = useState<Record<string, string>>({})
  const router = useRouter()
  const supabase = createClient()

  function toggleType(lt: string) {
    setCheckedTypes(prev => {
      const next = new Set(prev)
      next.has(lt) ? next.delete(lt) : next.add(lt)
      return next
    })
  }

  function reset() {
    setVendorType('inbound')
    setCheckedTypes(new Set())
    setTypeCosts({})
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
      if (val) lead_type_costs[lt] = parseFloat(val)
    }

    const locations = (fd.get('locations') as string)
      .split(',').map(s => s.trim()).filter(Boolean)

    const { error: err } = await supabase.from('vendors').insert({
      name: fd.get('name') as string,
      type: fd.get('type') as 'inbound' | 'manual',
      lead_types,
      lead_type_costs,
      locations,
      cost_per_lead: null,
    })

    setLoading(false)
    if (err) { setError('Failed to add vendor. Please try again.'); return }
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <>
      <Button className="flex items-center gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add Vendor
      </Button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); if (!val) reset() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. MediaAlpha" required />
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
                    <label className="flex items-center gap-2 text-sm cursor-pointer w-24 shrink-0">
                      <input
                        type="checkbox"
                        checked={checkedTypes.has(lt)}
                        onChange={() => toggleType(lt)}
                        className="rounded"
                      />
                      {lt}
                    </label>
                    {checkedTypes.has(lt) && (
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={typeCosts[lt] ?? ''}
                          onChange={e => setTypeCosts(prev => ({ ...prev, [lt]: e.target.value }))}
                          className="pl-6 h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locations">Locations</Label>
              <Input id="locations" name="locations" placeholder="e.g. TX, FL, CA" />
              <p className="text-xs text-gray-400">Comma-separated states or regions</p>
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
