'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Vendor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'

const LEAD_TYPES = ['ACA', 'Medicare']

export function EditVendorDialog({ vendor }: { vendor: Vendor }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    const { error: err } = await supabase.from('vendors').update({
      name: fd.get('name') as string,
      type: fd.get('type') as 'inbound' | 'manual',
      lead_types,
      locations,
      cost_per_lead,
    }).eq('id', vendor.id)

    setLoading(false)
    if (err) {
      setError('Failed to save. Please try again.')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-xs flex items-center gap-1.5">
        <Pencil size={12} />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); setError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${vendor.id}`}>Name</Label>
              <Input id={`name-${vendor.id}`} name="name" defaultValue={vendor.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`type-${vendor.id}`}>Type</Label>
              <select
                id={`type-${vendor.id}`}
                name="type"
                defaultValue={vendor.type}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 bg-white"
              >
                <option value="inbound">Inbound (webhook)</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Lead Types</Label>
              <div className="flex gap-4">
                {LEAD_TYPES.map(lt => (
                  <label key={lt} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      name="lead_types"
                      value={lt}
                      defaultChecked={vendor.lead_types.includes(lt)}
                      className="rounded"
                    />
                    {lt}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`locations-${vendor.id}`}>Locations</Label>
              <Input
                id={`locations-${vendor.id}`}
                name="locations"
                defaultValue={vendor.locations.join(', ')}
                placeholder="e.g. TX, FL, CA"
              />
              <p className="text-xs text-gray-400">Comma-separated states or regions</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cost_per_lead-${vendor.id}`}>Cost per Lead ($)</Label>
              <Input
                id={`cost_per_lead-${vendor.id}`}
                name="cost_per_lead"
                type="number"
                min="0"
                step="0.01"
                defaultValue={vendor.cost_per_lead ?? ''}
                placeholder="15.00"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
