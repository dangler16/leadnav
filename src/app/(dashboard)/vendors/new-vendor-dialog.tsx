'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

export function NewVendorDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)

    const lead_types = (fd.get('lead_types') as string)
      .split(',').map(s => s.trim()).filter(Boolean)
    const locations = (fd.get('locations') as string)
      .split(',').map(s => s.trim()).filter(Boolean)
    const cost_per_lead = fd.get('cost_per_lead') ? parseFloat(fd.get('cost_per_lead') as string) : null

    await supabase.from('vendors').insert({
      name: fd.get('name') as string,
      type: fd.get('type') as 'inbound' | 'manual',
      lead_types,
      locations,
      cost_per_lead,
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button className="flex items-center gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add Vendor
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
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
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 bg-white"
              >
                <option value="inbound">Inbound (webhook)</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead_types">Lead Types</Label>
              <Input id="lead_types" name="lead_types" placeholder="e.g. ACA, Medicare, Life Insurance" />
              <p className="text-xs text-gray-400">Comma-separated</p>
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
