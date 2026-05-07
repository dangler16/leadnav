'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { Team } from '@/lib/types'
import { updateTeam, deleteTeam } from './actions'

export function EditTeamDialog({ team }: { team: Team }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await updateTeam(
        team.id,
        fd.get('name') as string,
        (fd.get('phone') as string) || null,
        (fd.get('logo_url') as string) || null,
      )
      setOpen(false)
      router.refresh()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteTeam(team.id)
      setOpen(false)
      router.refresh()
    } catch {
      setError('Failed to delete team.')
    } finally {
      setDeleting(false)
    }
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
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${team.id}`}>Team Name</Label>
              <Input id={`name-${team.id}`} name="name" defaultValue={team.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`phone-${team.id}`}>Phone</Label>
              <Input id={`phone-${team.id}`} name="phone" type="tel" defaultValue={team.phone ?? ''} placeholder="(555) 555-5555" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`logo_url-${team.id}`}>Logo URL</Label>
              <Input id={`logo_url-${team.id}`} name="logo_url" type="url" defaultValue={team.logo_url ?? ''} placeholder="https://..." />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs flex items-center gap-1.5">
                <Trash2 size={12} />
                {deleting ? 'Deleting…' : 'Delete Team'}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
