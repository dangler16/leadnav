'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Pencil } from 'lucide-react'
import { Profile, Team, UserRole } from '@/lib/types'
import { updateUser, setUserTeam, setTeamAdminAssignments } from './actions'

export function EditUserDialog({
  profile,
  email,
  teams,
  memberTeamId,
  adminTeamIds,
}: {
  profile: Profile
  email: string
  teams: Team[]
  memberTeamId: string | null
  adminTeamIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>(profile.role)
  const [selectedTeamId, setSelectedTeamId] = useState<string>(memberTeamId ?? '')
  const [selectedAdminTeams, setSelectedAdminTeams] = useState<string[]>(adminTeamIds)
  const router = useRouter()

  function toggleAdminTeam(id: string) {
    setSelectedAdminTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
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
        role,
      })
      if (role === 'user') {
        await setUserTeam(profile.id, selectedTeamId || null)
      } else if (role === 'team_admin') {
        await setTeamAdminAssignments(profile.id, selectedAdminTeams)
      }
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
      <button
        onClick={() => { setOpen(true); setSelectedTeamId(memberTeamId ?? ''); setSelectedAdminTeams(adminTeamIds) }}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Pencil size={14} />
      </button>
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
              <Label>Role</Label>
              <SelectDropdown
                options={[
                  { value: 'user',        label: 'User' },
                  { value: 'team_admin',  label: 'Team Admin' },
                  { value: 'super_admin', label: 'Super Admin' },
                ]}
                value={role}
                onChange={v => setRole(v as UserRole)}
                name="role"
              />
            </div>

            {role === 'user' && teams.length > 0 && (
              <div className="space-y-1.5">
                <Label>Team</Label>
                <SelectDropdown
                  options={[{ value: '', label: 'No team' }, ...teams.map(t => ({ value: t.id, label: t.name }))]}
                  value={selectedTeamId}
                  onChange={setSelectedTeamId}
                  placeholder="Select team…"
                />
              </div>
            )}

            {role === 'team_admin' && teams.length > 0 && (
              <div className="space-y-1.5">
                <Label>Manages Teams</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-border/50 rounded-lg p-2">
                  {teams.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={selectedAdminTeams.includes(t.id)}
                        onChange={() => toggleAdminTeam(t.id)}
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
