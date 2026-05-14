'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Team, UserRole } from '@/lib/types'
import { inviteUser } from './actions'

export function InviteUserDialog({
  teams,
  callerRole,
  callerTeamIds,
}: {
  teams: Team[]
  callerRole: UserRole
  callerTeamIds: string[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<UserRole>('user')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedAdminTeams, setSelectedAdminTeams] = useState<string[]>([])
  const router = useRouter()

  const isSuperAdmin = callerRole === 'super_admin'
  const availableTeams = isSuperAdmin ? teams : teams.filter(t => callerTeamIds.includes(t.id))

  function toggleAdminTeam(id: string) {
    setSelectedAdminTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await inviteUser({
        email: fd.get('email') as string,
        firstName: fd.get('first_name') as string,
        lastName: fd.get('last_name') as string,
        role,
        teamId: role === 'user' ? (selectedTeamId || null) : null,
        teamAdminTeamIds: role === 'team_admin' ? selectedAdminTeams : [],
      })
      setOpen(false)
      setRole('user')
      setSelectedTeamId('')
      setSelectedAdminTeams([])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex items-center px-2 py-1 rounded-sm bg-red-600 text-white text-sm font-medium whitespace-nowrap overflow-hidden hover:bg-red-800 transition-colors h-fit">
        Invite User
      </Button>
      <Dialog open={open} onOpenChange={val => { setOpen(val); setError(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-fn">First Name</Label>
                <Input id="invite-fn" name="first_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-ln">Last Name</Label>
                <Input id="invite-ln" name="last_name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" name="email" type="email" required />
            </div>

            {isSuperAdmin && (
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
                />
              </div>
            )}

            {role === 'user' && availableTeams.length > 0 && (
              <div className="space-y-1.5">
                <Label>Team</Label>
                <SelectDropdown
                  options={[{ value: '', label: 'No team' }, ...availableTeams.map(t => ({ value: t.id, label: t.name }))]}
                  value={selectedTeamId}
                  onChange={setSelectedTeamId}
                  placeholder="Select team…"
                />
              </div>
            )}

            {role === 'team_admin' && isSuperAdmin && availableTeams.length > 0 && (
              <div className="space-y-1.5">
                <Label>Manages Teams</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-border/50 rounded-lg p-2">
                  {availableTeams.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-1 py-0.5 rounded">
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
            <p className="text-xs text-gray-400">An invite email will be sent to the user.</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send Invite'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
