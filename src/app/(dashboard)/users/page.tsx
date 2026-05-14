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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function UsersPage() {
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
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">
      <div className="flex items-start justify-between w-full pb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSuperAdmin ? 'Manage all users and roles.' : 'Manage your team members.'}
          </p>
        </div>
        <InviteUserDialog
          teams={teams}
          callerRole={myProfile.role as UserRole}
          callerTeamIds={callerAdminTeamIds}
        />
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Name</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Email</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Team</th>
                {isSuperAdmin && <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Role</th>}
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Joined</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {profiles.map(p => {
                const membership = membershipByUserId[p.id]
                const adminTeamIds = adminTeamIdsByUser[p.id] ?? []
                const adminTeams = adminTeamIds.map(id => teamsById[id]).filter(Boolean)

                const teamDisplay = p.role === 'user'
                  ? (isSuperAdmin
                      ? <UserTeamSelect userId={p.id} initialTeamId={membership?.team_id ?? null} teams={teams} />
                      : membership
                        ? <span className={`${badgeShape} bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400`}>{teamsById[membership.team_id]?.name ?? '—'}</span>
                        : <span className="text-xs text-muted-foreground/40">—</span>)
                  : p.role === 'team_admin'
                    ? adminTeams.length > 0
                      ? <div className="flex flex-wrap gap-1">{adminTeams.map(t => <span key={t.id} className={`${badgeShape} bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400`}>{t.name}</span>)}</div>
                      : <span className="text-xs text-muted-foreground/40">—</span>
                    : <span className="text-xs text-muted-foreground">All</span>

                return (
                  <tr key={p.id} className="hover:bg-muted transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold">
                          {(p.first_name?.[0] ?? '?').toUpperCase()}
                        </div>
                        <Link href={`/users/${p.id}`} className="font-medium text-foreground hover:text-red-600 transition-colors">
                          {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{emailById[p.id] ?? '—'}</td>
                    <td className="px-3 py-2">{teamDisplay}</td>
                    {isSuperAdmin && (
                      <td className="px-3 py-2">
                        <UserRoleSelect userId={p.id} initialRole={p.role as UserRole} />
                      </td>
                    )}
                    <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(p.created_at)}</td>
                    <td className="px-3 py-2 text-right">
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
