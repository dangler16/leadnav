import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Team, TeamMember, TeamAdminAssignment, Profile } from '@/lib/types'
import { NewTeamDialog } from './new-team-dialog'
import { EditTeamDialog } from './edit-team-dialog'
import { DeleteTeamButton } from './delete-team-button'
import { ManageMembersDialog } from './manage-members-dialog'
import { AssignAdminDialog } from './assign-admin-dialog'
import { SortableHeader, SortDir } from '@/components/sortable-header'

type MemberWithProfile = TeamMember & { profile: Profile }
type AssignmentWithProfile = TeamAdminAssignment & { profile: Profile }

function sortTeams(
  teams: Team[],
  allMembers: TeamMember[],
  allAssignments: TeamAdminAssignment[],
  profileById: Record<string, Profile>,
  col: string | null,
  dir: SortDir | null,
): Team[] {
  if (!col || !dir) return teams
  return [...teams].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'name') {
      av = a.name; bv = b.name
    } else if (col === 'admin') {
      const adminA = allAssignments.find(x => x.team_id === a.id)
      const adminB = allAssignments.find(x => x.team_id === b.id)
      const pA = adminA ? profileById[adminA.user_id] : null
      const pB = adminB ? profileById[adminB.user_id] : null
      av = pA ? [pA.first_name, pA.last_name].filter(Boolean).join(' ') : null
      bv = pB ? [pB.first_name, pB.last_name].filter(Boolean).join(' ') : null
    } else if (col === 'members') {
      av = allMembers.filter(m => m.team_id === a.id).length
      bv = allMembers.filter(m => m.team_id === b.id).length
    } else {
      av = a.created_at; bv = b.created_at
    }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av
    const cmp = String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })
}

export default async function TeamsPage({
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

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'super_admin') redirect('/dashboard')

  const service = createServiceClient()

  const [{ data: teamsData }, { data: membersData }, { data: profilesData }, { data: assignmentsData }] = await Promise.all([
    supabase.from('teams').select('*').order('created_at', { ascending: false }),
    service.from('team_members').select('*'),
    service.from('profiles').select('*').order('first_name'),
    service.from('team_admin_assignments').select('*'),
  ])

  const teams = (teamsData ?? []) as Team[]
  const allMembers = (membersData ?? []) as TeamMember[]
  const allProfiles = (profilesData ?? []) as Profile[]
  const allAssignments = (assignmentsData ?? []) as TeamAdminAssignment[]

  const profileById = Object.fromEntries(allProfiles.map(p => [p.id, p]))
  const teamAdmins = allProfiles.filter(p => p.role === 'team_admin' || p.role === 'super_admin')

  const sorted = sortTeams(teams, allMembers, allAssignments, profileById, sort, sortDir)

  function getMembersForTeam(teamId: string): MemberWithProfile[] {
    return allMembers
      .filter(m => m.team_id === teamId)
      .map(m => ({ ...m, profile: profileById[m.user_id] ?? { id: m.user_id, first_name: '?', last_name: '', role: 'user' as const, created_at: '' } }))
  }

  function getAdminsForTeam(teamId: string): AssignmentWithProfile[] {
    return allAssignments
      .filter(a => a.team_id === teamId)
      .map(a => ({ ...a, profile: profileById[a.user_id] ?? { id: a.user_id, first_name: '?', last_name: '', role: 'team_admin' as const, created_at: '' } }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-foreground">Teams</h1>
        <NewTeamDialog allUsers={allProfiles} />
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-border rounded-lg overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2.5"><SortableHeader column="name"    label="Team"    currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="admin"   label="Admin"   currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="members" label="Members" currentSort={sort} currentDir={sortDir} /></th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-muted-foreground">No teams yet. Create one to get started.</td>
                </tr>
              )}
              {sorted.map(team => {
                const members = getMembersForTeam(team.id)
                const admins = getAdminsForTeam(team.id)

                return (
                  <tr key={team.id} className="border-b border-border hover:bg-muted transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.name} className="w-7 h-7 rounded object-contain border border-border shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold shrink-0">
                            {team.name[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium text-foreground">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {admins.length > 0
                        ? admins.map(a => [a.profile.first_name, a.profile.last_name].filter(Boolean).join(' ')).join(', ')
                        : <span className="text-border">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {members.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {members.slice(0, 6).map(m => (
                            <div
                              key={m.user_id}
                              title={[m.profile.first_name, m.profile.last_name].filter(Boolean).join(' ')}
                              className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold"
                            >
                              {(m.profile.first_name?.[0] ?? '?').toUpperCase()}
                            </div>
                          ))}
                          {members.length > 6 && (
                            <span className="text-xs text-muted-foreground ml-1">+{members.length - 6}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <AssignAdminDialog team={team} assignments={admins} teamAdmins={teamAdmins} />
                        <ManageMembersDialog team={team} members={members} allProfiles={allProfiles} />
                        <DeleteTeamButton teamId={team.id} teamName={team.name} />
                        <EditTeamDialog team={team} />
                      </div>
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
