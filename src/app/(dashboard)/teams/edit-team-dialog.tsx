'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil, Trash2, ImagePlus } from 'lucide-react'
import { Team } from '@/lib/types'
import { updateTeam, deleteTeam, uploadTeamLogo } from './actions'

export function EditTeamDialog({ team }: { team: Team }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [logoCleared, setLogoCleared] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setLogoCleared(false)
  }

  const currentLogo = preview ?? (logoCleared ? null : team.logo_url)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      let logoUrl = team.logo_url
      const file = fileRef.current?.files?.[0]
      if (file) {
        const uploadFd = new FormData()
        uploadFd.set('file', file)
        logoUrl = await uploadTeamLogo(uploadFd)
      } else if (logoCleared) {
        logoUrl = null
      }
      await updateTeam(
        team.id,
        fd.get('name') as string,
        logoUrl,
      )
      setOpen(false)
      setPreview(null)
      setLogoCleared(false)
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
    if (!val) { setPreview(null); setLogoCleared(false) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center w-16 h-16 rounded-md border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
              >
                {currentLogo ? (
                  <img src={currentLogo} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={20} className="text-gray-400" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />
              {currentLogo && (
                <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={() => { setPreview(null); setLogoCleared(true); if (fileRef.current) fileRef.current.value = '' }}>
                  Remove
                </button>
              )}
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
