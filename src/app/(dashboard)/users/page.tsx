import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Profile, Team, TeamMember, TeamAdminAssignment, UserRole } from '@/lib/types'
import { redirect } from 'next/navigation'
import { EditUserDialog } from './edit-user-dialog'
import { InviteUserDialog } from './invite-user-dialog'
import { UserRoleSelect } from './user-role-select'
import { UserTeamSelect } from './user-team-select'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SortableHeader, SortDir } from '@/components/sortable-header'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function sortProfiles(
  profiles: Profile[],
  emailById: Record<string, string>,
  col: string | null,
  dir: SortDir | null,
): Profile[] {
  if (!col || !dir) return profiles
  return [...profiles].sort((a, b) => {
    let av: string | null, bv: string | null
    if (col === 'name') {
      av = [a.first_name, a.last_name].filter(Boolean).join(' ') || null
      bv = [b.first_name, b.last_name].filter(Boolean).join(' ') || null
    } else if (col === 'email') {
      av = emailById[a.id] ?? null; bv = emailById[b.id] ?? null
    } else if (col === 'role') {
      av = a.role; bv = b.role
    } else {
      av = a.created_at; bv = b.created_at
    }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av.localeCompare(bv)
    return dir === 'asc' ? cmp : -cmp
  })
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; sortDir?: string }>
}) {
  const params = await searchParams
  const sort = params.sort ?? null
  const sortDir = (params.sortDir as SortDir | undefined) ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!myProfile || (myProfile.role !== 'super_admin' && myProfile.role !== 'team_admin')) redirect('/dashboard')

  const isSuperAdmin = myProfile.role === 'super_admin'
  const service = createServiceClient()

  const [{ data: teamsData }, { data: membersData }, { data: assignmentsData }] = await Promise.all([
    supabase.from('teams').select('*').order('name'),
    service.from('team_members').select('*'),
    service.from('team_admin_assignments').select('*'),
  ])

  const teams = (teamsData ?? []) as Team[]
  const allMembers = (membersData ?? []) as TeamMember[]
  const allAssignments = (assignmentsData ?? []) as TeamAdminAssignment[]

  let profiles: Profile[]
  if (isSuperAdmin) {
    const { data } = await service.from('profiles').select('*').order('created_at', { ascending: false })
    profiles = (data ?? []) as Profile[]
  } else {
    const myTeamIds = allAssignments.filter(a => a.user_id === user.id).map(a => a.team_id)
    const memberIds = allMembers.filter(m => myTeamIds.includes(m.team_id)).map(m => m.user_id)
    const { data } = await supabase.from('profiles').select('*').in('id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000']).order('first_name')
    profiles = (data ?? []) as Profile[]
  }

  const { data: { users: authUsers } } = await service.auth.admin.listUsers()
  const emailById = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? '']))

  const sorted = sortProfiles(profiles, emailById, sort, sortDir)

  const membershipByUserId: Record<string, TeamMember> = {}
  for (const m of allMembers) {
    membershipByUserId[m.user_id] = m
  }

  const adminTeamIdsByUser: Record<string, string[]> = {}
  for (const a of allAssignments) {
    if (!adminTeamIdsByUser[a.user_id]) adminTeamIdsByUser[a.user_id] = []
    adminTeamIdsByUser[a.user_id].push(a.team_id)
  }

  const teamsById = Object.fromEntries(teams.map(t => [t.id, t]))
  const callerAdminTeamIds = allAssignments.filter(a => a.user_id === user.id).map(a => a.team_id)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <InviteUserDialog
          teams={teams}
          callerRole={myProfile.role as UserRole}
          callerTeamIds={callerAdminTeamIds}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2.5"><SortableHeader column="name"   label="Name"   currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="email"  label="Email"  currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 px-3 py-2.5">Team</th>
                {isSuperAdmin && <th className="text-left px-3 py-2.5"><SortableHeader column="role" label="Role" currentSort={sort} currentDir={sortDir} /></th>}
                <th className="text-left px-3 py-2.5"><SortableHeader column="joined" label="Joined" currentSort={sort} currentDir={sortDir} /></th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="py-12 text-center text-xs text-gray-400">No users found.</td>
                </tr>
              )}
              {sorted.map(p => {
                const membership = membershipByUserId[p.id]
                const adminTeamIds = adminTeamIdsByUser[p.id] ?? []
                const adminTeams = adminTeamIds.map(id => teamsById[id]).filter(Boolean)

                const teamDisplay = p.role === 'user'
                  ? (isSuperAdmin
                      ? <UserTeamSelect userId={p.id} initialTeamId={membership?.team_id ?? null} teams={teams} />
                      : membership
                        ? <span className={cn(badgeShape, 'bg-blue-100 text-blue-700 border border-blue-200')}>{teamsById[membership.team_id]?.name ?? '—'}</span>
                        : <span className="text-xs text-gray-400">—</span>)
                  : p.role === 'team_admin'
                    ? adminTeams.length > 0
                      ? <div className="flex flex-wrap gap-1">{adminTeams.map(t => <span key={t.id} className={cn(badgeShape, 'bg-purple-100 text-purple-700 border border-purple-200')}>{t.name}</span>)}</div>
                      : <span className="text-xs text-gray-400">—</span>
                    : <span className="text-xs text-gray-400">All</span>

                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            (p.first_name?.[0] ?? '?').toUpperCase()
                          )}
                        </div>
                        <Link href={`/users/${p.id}`} className="text-xs font-medium text-gray-900 hover:text-gray-500 transition-colors">
                          {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{emailById[p.id] ?? '—'}</td>
                    <td className="px-3 py-2.5">{teamDisplay}</td>
                    {isSuperAdmin && (
                      <td className="px-3 py-2.5">
                        <UserRoleSelect userId={p.id} initialRole={p.role as UserRole} />
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-xs text-gray-400">{formatDate(p.created_at)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {isSuperAdmin && (
                        <EditUserDialog
                          profile={p}
                          email={emailById[p.id] ?? ''}
                          teams={teams}
                          memberTeamId={membership?.team_id ?? null}
                          adminTeamIds={adminTeamIds}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
