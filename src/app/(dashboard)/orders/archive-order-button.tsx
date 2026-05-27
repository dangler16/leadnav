'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { archiveOrder, unarchiveOrder } from './actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function ArchiveOrderButton({
  orderId,
  archived,
  status,
}: {
  orderId: string
  archived: boolean
  status: string
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleClick() {
    if (!archived && status === 'active') {
      setConfirmOpen(true)
    } else {
      void doArchive()
    }
  }

  async function doArchive() {
    setLoading(true)
    setConfirmOpen(false)
    try {
      if (archived) {
        await unarchiveOrder(orderId)
      } else {
        await archiveOrder(orderId, status)
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted"
      >
        {loading ? 'Archive' : archived ? 'Unarchive' : 'Archive'}
      </button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Archive order?</DialogTitle>
            <DialogDescription>
              This order is currently active and will be closed when archived. No new leads will be delivered to it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void doArchive()}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
