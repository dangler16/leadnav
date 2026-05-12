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
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)

    const lead_types = fd.getAll('lead_types') as string[]
    const locations = (fd.get('locations') as string)
      .split(',').map(s => s.trim()).filter(Boolean)
    const cost_per_lead = fd.get('cost_per_lead') ? parseFloat(fd.get('cost_per_lead') as string) : null

    const { error: err } = await supabase.from('vendors').insert({
      name: fd.get('name') as string,
      type: fd.get('type') as 'inbound' | 'manual',
      lead_types,
      locations,
      cost_per_lead,
    })

    setLoading(false)
    if (err) {
      setError('Failed to add vendor. Please try again.')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button className="flex items-center gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add Vendor
      </Button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); setError(null) }}>
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
              <Label>Lead Types</Label>
              <div className="flex gap-4">
                {LEAD_TYPES.map(lt => (
                  <label key={lt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" name="lead_types" value={lt} className="rounded" />
                    {lt}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locations">Locations</Label>
              <Input id="locations" name="locations" placeholder="e.g. TX, FL, CA" />
              <p className="text-xs text-gray-400">Comma-separated states or regions</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost_per_lead">Cost per Lead ($)</Label>
              <Input id="cost_per_lead" name="cost_per_lead" type="number" min="0" step="0.01" placeholder="15.00" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add Vendor'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
