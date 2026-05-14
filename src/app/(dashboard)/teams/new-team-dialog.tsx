'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImagePlus } from 'lucide-react'
import { Profile } from '@/lib/types'
import { createTeam, uploadTeamLogo, assignTeamAdminAndPromote } from './actions'

function adminLabel(p: Profile) {
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id
}

function AdminSearch({ admins, value, onChange }: { admins: Profile[]; value: string; onChange: (id: string) => void }) {
  const selected = admins.find(p => p.id === value)
  const [query, setQuery] = useState(selected ? adminLabel(selected) : '')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? admins.filter(p => adminLabel(p).toLowerCase().includes(query.toLowerCase()))
    : admins

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        if (!value) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [value])

  function select(p: Profile) {
    onChange(p.id)
    setQuery(adminLabel(p))
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          if (!e.target.value) onChange('')
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search team admins…"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md text-sm">
          {filtered.map(p => (
            <li
              key={p.id}
              onMouseDown={() => select(p)}
              className="cursor-pointer px-3 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {adminLabel(p)}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          No team admins found
        </div>
      )}
    </div>
  )
}

export function NewTeamDialog({ allUsers }: { allUsers: Profile[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedAdminId, setSelectedAdminId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const ALLOWED_TYPES = ['image/png', 'image/webp', 'image/svg+xml']

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Logo must be a PNG, WebP, or SVG.')
      e.target.value = ''
      return
    }
    setError(null)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      let logoUrl: string | null = null
      const file = fileRef.current?.files?.[0]
      if (file) {
        const uploadFd = new FormData()
        uploadFd.set('file', file)
        logoUrl = await uploadTeamLogo(uploadFd)
      }
      const teamId = await createTeam(fd.get('name') as string, logoUrl)
      if (selectedAdminId) {
        await assignTeamAdminAndPromote(teamId, selectedAdminId)
      }
      setOpen(false)
      setPreview(null)
      setSelectedAdminId('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose(val: boolean) {
    setOpen(val)
    setError(null)
    if (!val) { setPreview(null); setSelectedAdminId('') }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center px-2 py-1 rounded-sm bg-red-600 text-white text-sm font-medium whitespace-nowrap overflow-hidden hover:bg-red-800 transition-colors h-fit">
        New Team
      </Button>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin</Label>
              <AdminSearch admins={allUsers} value={selectedAdminId} onChange={setSelectedAdminId} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center w-16 h-16 rounded-md border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
              >
                {preview ? (
                  <img src={preview} alt="Logo preview" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={20} className="text-gray-400" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" className="hidden" onChange={handleFileChange} />
              {preview && (
                <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}>
                  Remove
                </button>
              )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Team'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
