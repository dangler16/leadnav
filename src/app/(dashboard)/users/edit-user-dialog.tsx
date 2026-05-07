'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Pencil } from 'lucide-react'
import { Profile, Team } from '@/lib/types'
import { updateUser, setUserTeams } from './actions'

export function EditUserDialog({
  profile,
  email,
  teams,
  memberTeamIds,
}: {
  profile: Profile
  email: string
  teams: Team[]
  memberTeamIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeams, setSelectedTeams] = useState<string[]>(memberTeamIds)
  const router = useRouter()

  function toggleTeam(id: string) {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await updateUser(profile.id, {
        firstName: fd.get('first_name') as string,
        lastName: fd.get('last_name') as string,
        email: fd.get('email') as string,
        role: fd.get('role') as 'agent' | 'admin',
      })
      await setUserTeams(profile.id, selectedTeams)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'User'

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setOpen(true); setSelectedTeams(memberTeamIds) }} className="text-xs flex items-center gap-1.5">
        <Pencil size={12} />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); setError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {fullName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`fn-${profile.id}`}>First Name</Label>
                <Input id={`fn-${profile.id}`} name="first_name" defaultValue={profile.first_name ?? ''} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`ln-${profile.id}`}>Last Name</Label>
                <Input id={`ln-${profile.id}`} name="last_name" defaultValue={profile.last_name ?? ''} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`email-${profile.id}`}>Email</Label>
              <Input id={`email-${profile.id}`} name="email" type="email" defaultValue={email} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`role-${profile.id}`}>Role</Label>
              <select
                id={`role-${profile.id}`}
                name="role"
                defaultValue={profile.role}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 bg-white"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {teams.length > 0 && (
              <div className="space-y-1.5">
                <Label>Teams</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-100 rounded-lg p-2">
                  {teams.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(t.id)}
                        onChange={() => toggleTeam(t.id)}
                        className="rounded"
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
