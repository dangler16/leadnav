'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { deleteTeam } from './actions'

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await deleteTeam(teamId)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete team. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 size={15} />
      </button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); setError(null) }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{teamName}</span>? This cannot be undone.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
