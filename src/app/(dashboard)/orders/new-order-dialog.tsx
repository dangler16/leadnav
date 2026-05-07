'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Vendor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

export function NewOrderDialog({ vendors, userId }: { vendors: Vendor[]; userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const selectedVendor = vendors.find(v => v.id === selectedVendorId) ?? null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    await supabase.from('orders').insert({
      account_id: userId,
      vendor_id: fd.get('vendor_id') || null,
      lead_type: fd.get('lead_type') || null,
      daily_budget: fd.get('daily_budget') ? parseFloat(fd.get('daily_budget') as string) : null,
      status: 'placed',
    })
    setLoading(false)
    setOpen(false)
    setSelectedVendorId('')
    router.refresh()
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) setSelectedVendorId('')
  }

  return (
    <>
      <Button className="flex items-center gap-2" onClick={() => setOpen(true)}>
        <Plus size={15} /> Place Order
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Place New Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="vendor_id">Vendor</Label>
              <select
                id="vendor_id"
                name="vendor_id"
                value={selectedVendorId}
                onChange={e => setSelectedVendorId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 bg-white"
                required
              >
                <option value="">Select vendor…</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead_type">Lead Type</Label>
              <select
                id="lead_type"
                name="lead_type"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!selectedVendor || selectedVendor.lead_types.length === 0}
                required
              >
                <option value="">
                  {!selectedVendor
                    ? 'Select a vendor first'
                    : selectedVendor.lead_types.length === 0
                    ? 'No lead types configured'
                    : 'Select lead type…'}
                </option>
                {selectedVendor?.lead_types.map(lt => (
                  <option key={lt} value={lt}>{lt}</option>
                ))}
              </select>
              {selectedVendor?.cost_per_lead != null && (
                <p className="text-xs text-gray-500">
                  Cost per lead: <span className="font-medium">${selectedVendor.cost_per_lead}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="daily_budget">Daily Budget ($)</Label>
              <Input id="daily_budget" name="daily_budget" type="number" min="0" step="0.01" placeholder="100.00" required />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Placing…' : 'Place Order'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
