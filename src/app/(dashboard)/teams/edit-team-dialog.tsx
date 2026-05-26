'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2 } from 'lucide-react'
import { Team } from '@/lib/types'
import { updateTeam, deleteTeam, uploadTeamLogo } from './actions'
import { LogoCropUpload } from './logo-crop-upload'

export function EditTeamDialog({ team }: { team: Team }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // undefined = no change, null = cleared, Blob = new logo
  const [logoBlob, setLogoBlob] = useState<Blob | null | undefined>(undefined)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      let logoUrl = team.logo_url
      if (logoBlob instanceof Blob) {
        const ext = logoBlob.type === 'image/svg+xml' ? 'svg' : 'png'
        const uploadFd = new FormData()
        uploadFd.set('file', new File([logoBlob], `logo.${ext}`, { type: logoBlob.type }))
        logoUrl = await uploadTeamLogo(uploadFd)
      } else if (logoBlob === null) {
        logoUrl = null
      }
      await updateTeam(team.id, fd.get('name') as string, logoUrl)
      setOpen(false)
      setLogoBlob(undefined)
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

  function handleClose(val: boolean) {
    setOpen(val)
    setError(null)
    if (!val) { setLogoBlob(undefined) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Pencil size={14} />
      </button>
      <Dialog open={open} onOpenChange={handleClose}>
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
              <Label>Logo</Label>
              <LogoCropUpload
                currentUrl={team.logo_url}
                onBlobChange={setLogoBlob}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center justify-between pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs flex items-center gap-1.5">
                <Trash2 size={12} />
                {deleting ? 'Deleting…' : 'Delete Team'}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
