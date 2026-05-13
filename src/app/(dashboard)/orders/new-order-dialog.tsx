'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Vendor } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Plus } from 'lucide-react'

export function NewOrderDialog({ vendors, userId }: { vendors: Vendor[]; userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [selectedLeadType, setSelectedLeadType] = useState('')
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
      status: 'active',
    })
    setLoading(false)
    setOpen(false)
    setSelectedVendorId('')
    router.refresh()
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) { setSelectedVendorId(''); setSelectedLeadType('') }
  }

  return (
    <>
      <Button className="flex items-center px-2 py-1 rounded-sm bg-red-600 text-white text-sm font-medium whitespace-nowrap overflow-hidden hover:bg-red-800 transition-colors h-fit" onClick={() => setOpen(true)}>
        Place Order
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Place New Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <SelectDropdown
                options={vendors.map(v => ({ value: v.id, label: v.name }))}
                value={selectedVendorId}
                onChange={v => { setSelectedVendorId(v); setSelectedLeadType('') }}
                name="vendor_id"
                placeholder="Select vendor…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Lead Type</Label>
              <SelectDropdown
                options={(selectedVendor?.lead_types ?? []).map(lt => ({ value: lt, label: lt }))}
                value={selectedLeadType}
                onChange={setSelectedLeadType}
                name="lead_type"
                placeholder={
                  !selectedVendor
                    ? 'Select a vendor first'
                    : selectedVendor.lead_types.length === 0
                    ? 'No lead types configured'
                    : 'Select lead type…'
                }
                disabled={!selectedVendor || selectedVendor.lead_types.length === 0}
              />
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
