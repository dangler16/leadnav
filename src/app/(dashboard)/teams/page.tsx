import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Team, TeamMember, TeamAdminAssignment, Profile } from '@/lib/types'
import { NewTeamDialog } from './new-team-dialog'
import { EditTeamDialog } from './edit-team-dialog'
import { ManageMembersDialog } from './manage-members-dialog'
import { AssignAdminDialog } from './assign-admin-dialog'

type MemberWithProfile = TeamMember & { profile: Profile }
type AssignmentWithProfile = TeamAdminAssignment & { profile: Profile }

export default async function TeamsPage() {
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
  const teamAdmins = allProfiles.filter(p => p.role === 'team_admin')

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
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">
      <div className="flex items-start justify-between w-full pb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Organize agents into teams.</p>
        </div>
        <NewTeamDialog allUsers={allProfiles} />
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Team</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Admin</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Members</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {teams.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-muted-foreground">No teams yet. Create one to get started.</td>
                </tr>
              )}
              {teams.map(team => {
                const members = getMembersForTeam(team.id)
                const admins = getAdminsForTeam(team.id)

                return (
                  <tr key={team.id} className="hover:bg-muted transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt={team.name} className="w-7 h-7 rounded-sm object-cover border border-border/50 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-sm bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold shrink-0">
                            {team.name[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-foreground">{team.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {admins.length > 0
                        ? admins.map(a => [a.profile.first_name, a.profile.last_name].filter(Boolean).join(' ')).join(', ')
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {members.length === 0 ? (
                        <span className="text-sm text-muted-foreground/40">—</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {members.slice(0, 6).map(m => (
                            <div
                              key={m.user_id}
                              title={[m.profile.first_name, m.profile.last_name].filter(Boolean).join(' ')}
                              className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold"
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
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <AssignAdminDialog team={team} assignments={admins} teamAdmins={teamAdmins} />
                        <ManageMembersDialog team={team} members={members} allProfiles={allProfiles} />
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
