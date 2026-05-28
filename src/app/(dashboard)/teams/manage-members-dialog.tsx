'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { Team, TeamMember, Profile } from '@/lib/types'
import { addTeamMember, removeTeamMember, updateMemberPermissions } from './actions'
import { UserMinus, Users } from 'lucide-react'

type MemberWithProfile = TeamMember & { profile: Profile }

const PERMISSIONS: { key: keyof Pick<TeamMember, 'can_order' | 'can_view_leads' | 'can_make_calls' | 'can_file_disputes'>; label: string }[] = [
  { key: 'can_view_leads',    label: 'Leads' },
  { key: 'can_order',         label: 'Orders' },
  { key: 'can_make_calls',    label: 'Calls' },
  { key: 'can_file_disputes', label: 'Disputes' },
]

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
  const router = useRouter()

  const memberIds = new Set(members.map(m => m.user_id))
  const available = allProfiles.filter(p => !memberIds.has(p.id) && p.role !== 'super_admin')

  async function handleAdd() {
    if (!addUserId) return
    setLoading('add')
    try {
      await addTeamMember(team.id, addUserId)
      setAddUserId('')
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

  async function handleTogglePermission(
    member: MemberWithProfile,
    key: keyof Pick<TeamMember, 'can_order' | 'can_view_leads' | 'can_make_calls' | 'can_file_disputes'>
  ) {
    setLoading(`perm-${member.user_id}-${key}`)
    try {
      await updateMemberPermissions(team.id, member.user_id, {
        can_order:         key === 'can_order'         ? !member.can_order         : member.can_order,
        can_view_leads:    key === 'can_view_leads'    ? !member.can_view_leads    : member.can_view_leads,
        can_make_calls:    key === 'can_make_calls'    ? !member.can_make_calls    : member.can_make_calls,
        can_file_disputes: key === 'can_file_disputes' ? !member.can_file_disputes : member.can_file_disputes,
      })
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{team.name} — Members</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            {members.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No members yet.</p>
            )}

            {members.length > 0 && (
              <div className="mb-3">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1.5 px-1">User</th>
                      {PERMISSIONS.map(p => (
                        <th key={p.key} className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1.5 px-2">{p.label}</th>
                      ))}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(m => {
                      const name = [m.profile.first_name, m.profile.last_name].filter(Boolean).join(' ') || '—'
                      return (
                        <tr key={m.user_id} className="border-t border-border">
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                                {(m.profile.first_name?.[0] ?? '?').toUpperCase()}
                              </div>
                              <p className="text-xs font-medium text-foreground truncate">{name}</p>
                            </div>
                          </td>
                          {PERMISSIONS.map(({ key }) => (
                            <td key={key} className="py-2 px-2 text-center">
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleTogglePermission(m, key)}
                                  disabled={!!loading}
                                  role="switch"
                                  aria-checked={!!m[key]}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50 ${
                                    m[key] ? 'bg-red-500' : 'bg-muted'
                                  }`}
                                >
                                  <span className={`pointer-events-none h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                                    m[key] ? 'translate-x-4' : 'translate-x-0'
                                  }`} />
                                </button>
                              </div>
                            </td>
                          ))}
                          <td className="py-2 px-1 text-right">
                            <button
                              onClick={() => handleRemove(m.user_id)}
                              disabled={loading === `remove-${m.user_id}`}
                              className="p-1 rounded-md text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <UserMinus size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {available.length > 0 && (
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add Member</p>
                <div className="flex gap-2">
                  <SelectDropdown
                    options={available.map(p => ({ value: p.id, label: [p.first_name, p.last_name].filter(Boolean).join(' ') || p.id }))}
                    value={addUserId}
                    onChange={setAddUserId}
                    placeholder="Select user…"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleAdd} disabled={!addUserId || loading === 'add'}>
                    {loading === 'add' ? '…' : 'Add'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
