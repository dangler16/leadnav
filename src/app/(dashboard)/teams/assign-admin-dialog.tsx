'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Team, TeamAdminAssignment, Profile } from '@/lib/types'
import { assignTeamAdmin, removeTeamAdmin } from './actions'
import { ShieldCheck, UserMinus } from 'lucide-react'

type AssignmentWithProfile = TeamAdminAssignment & { profile: Profile }

export function AssignAdminDialog({
  team,
  assignments,
  teamAdmins,
}: {
  team: Team
  assignments: AssignmentWithProfile[]
  teamAdmins: Profile[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const router = useRouter()

  const assignedIds = new Set(assignments.map(a => a.user_id))
  const available = teamAdmins.filter(p => !assignedIds.has(p.id))

  async function handleAssign() {
    if (!selectedUserId) return
    setLoading('assign')
    try {
      await assignTeamAdmin(team.id, selectedUserId)
      setSelectedUserId('')
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleRemove(userId: string) {
    setLoading(`remove-${userId}`)
    try {
      await removeTeamAdmin(team.id, userId)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-xs flex items-center gap-1.5">
        <ShieldCheck size={12} />
        Admins ({assignments.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{team.name} — Team Admins</DialogTitle>
          </DialogHeader>

          <div className="space-y-1 mt-2">
            {assignments.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No team admins assigned.</p>
            )}
            {assignments.map(a => {
              const name = [a.profile.first_name, a.profile.last_name].filter(Boolean).join(' ') || '—'
              return (
                <div key={a.user_id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                    {(a.profile.first_name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <p className="flex-1 text-xs font-medium text-foreground truncate">{name}</p>
                  <button
                    onClick={() => handleRemove(a.user_id)}
                    disabled={loading === `remove-${a.user_id}`}
                    className="p-1.5 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              )
            })}
          </div>

          {available.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assign Team Admin</p>
              <div className="flex gap-2">
                <SelectDropdown
                  options={available.map(p => ({ value: p.id, label: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id }))}
                  value={selectedUserId}
                  onChange={setSelectedUserId}
                  placeholder="Select admin…"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAssign} disabled={!selectedUserId || loading === 'assign'}>
                  {loading === 'assign' ? '…' : 'Assign'}
                </Button>
              </div>
            </div>
          )}

          {available.length === 0 && teamAdmins.length === 0 && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              No team admins exist yet. Promote a user to Team Admin from the Users page first.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
