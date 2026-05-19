'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { deleteVendor } from './actions'

export function DeleteVendorButton({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteVendor(vendorId)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete vendor. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 transition-colors"
      >
        <Trash2 size={18} />
      </button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); setError(null) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-gray-900">{vendorName}</span>? This cannot be undone.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {loading ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
