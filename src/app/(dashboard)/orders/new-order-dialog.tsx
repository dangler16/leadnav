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
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    await supabase.from('orders').insert({
      account_id: userId,
      vendor_id: fd.get('vendor_id') || null,
      line_of_business: fd.get('line_of_business') || null,
      lead_type: fd.get('lead_type') || null,
      location: fd.get('location') || null,
      daily_budget: fd.get('daily_budget') ? parseFloat(fd.get('daily_budget') as string) : null,
      cost_per_lead: fd.get('cost_per_lead') ? parseFloat(fd.get('cost_per_lead') as string) : null,
      availability_start: fd.get('availability_start') || null,
      availability_end: fd.get('availability_end') || null,
      status: 'placed',
    })
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button className="flex items-center gap-2" onClick={() => setOpen(true)}><Plus size={15} /> Place Order</Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Place New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="vendor_id">Vendor</Label>
            <select name="vendor_id" id="vendor_id" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 bg-white">
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="line_of_business">Line of Business</Label>
              <Input id="line_of_business" name="line_of_business" placeholder="e.g. Health Insurance" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead_type">Lead Type</Label>
              <Input id="lead_type" name="lead_type" placeholder="e.g. ACA, Medicare" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" placeholder="e.g. Texas, 78701" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="daily_budget">Daily Budget ($)</Label>
              <Input id="daily_budget" name="daily_budget" type="number" min="0" step="0.01" placeholder="100.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost_per_lead">Cost Per Lead ($)</Label>
              <Input id="cost_per_lead" name="cost_per_lead" type="number" min="0" step="0.01" placeholder="15.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="availability_start">Start Date</Label>
              <Input id="availability_start" name="availability_start" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="availability_end">End Date</Label>
              <Input id="availability_end" name="availability_end" type="date" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Placing…' : 'Place Order'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
