'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Team, TeamMember, Profile } from '@/lib/types'
import { addTeamMember, removeTeamMember, updateMemberRole } from './actions'
import { Crown, UserMinus, Users } from 'lucide-react'

type MemberWithProfile = TeamMember & { profile: Profile }

export function ManageMembersDialog({
  team,
  members,
  allProfiles,
}: {
  team: Team
  members: MemberWithProfile[]
  allProfiles: Profile[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState<'leader' | 'member'>('member')
  const router = useRouter()

  const memberIds = new Set(members.map(m => m.user_id))
  const available = allProfiles.filter(p => !memberIds.has(p.id))

  async function handleAdd() {
    if (!addUserId) return
    setLoading('add')
    try {
      await addTeamMember(team.id, addUserId, addRole)
      setAddUserId('')
      setAddRole('member')
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleRemove(userId: string) {
    setLoading(`remove-${userId}`)
    try {
      await removeTeamMember(team.id, userId)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleToggleRole(userId: string, current: 'leader' | 'member') {
    setLoading(`role-${userId}`)
    try {
      await updateMemberRole(team.id, userId, current === 'leader' ? 'member' : 'leader')
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="text-xs flex items-center gap-1.5">
        <Users size={12} />
        Members ({members.length})
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{team.name} — Members</DialogTitle>
          </DialogHeader>

          <div className="space-y-1 mt-2">
            {members.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No members yet.</p>
            )}
            {members.map(m => {
              const name = [m.profile.first_name, m.profile.last_name].filter(Boolean).join(' ') || '—'
              return (
                <div key={m.user_id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                    {(m.profile.first_name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                    <p className="text-xs text-gray-400">{m.role === 'leader' ? 'Team Leader' : 'Member'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleRole(m.user_id, m.role)}
                      disabled={loading === `role-${m.user_id}`}
                      title={m.role === 'leader' ? 'Demote to member' : 'Promote to leader'}
                      className={`p-1.5 rounded-md transition-colors ${m.role === 'leader' ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'}`}
                    >
                      <Crown size={13} />
                    </button>
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      disabled={loading === `remove-${m.user_id}`}
                      className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {available.length > 0 && (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Add Member</p>
              <div className="flex gap-2">
                <SelectDropdown
                  options={available.map(p => ({ value: p.id, label: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id }))}
                  value={addUserId}
                  onChange={setAddUserId}
                  placeholder="Select user…"
                  className="flex-1"
                />
                <SelectDropdown
                  options={[{ value: 'member', label: 'Member' }, { value: 'leader', label: 'Leader' }]}
                  value={addRole}
                  onChange={v => setAddRole(v as 'leader' | 'member')}
                />
                <Button size="sm" onClick={handleAdd} disabled={!addUserId || loading === 'add'}>
                  {loading === 'add' ? '…' : 'Add'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
