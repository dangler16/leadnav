import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersRound, Phone } from 'lucide-react'
import { Team, TeamMember, Profile } from '@/lib/types'
import { NewTeamDialog } from './new-team-dialog'
import { EditTeamDialog } from './edit-team-dialog'
import { ManageMembersDialog } from './manage-members-dialog'

type MemberWithProfile = TeamMember & { profile: Profile }

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'admin') redirect('/dashboard')

  const [{ data: teamsData }, { data: membersData }, { data: profilesData }] = await Promise.all([
    supabase.from('teams').select('*').order('created_at', { ascending: false }),
    supabase.from('team_members').select('*'),
    supabase.from('profiles').select('*').order('first_name'),
  ])

  const teams = (teamsData ?? []) as Team[]
  const allMembers = (membersData ?? []) as TeamMember[]
  const allProfiles = (profilesData ?? []) as Profile[]

  const profileById = Object.fromEntries(allProfiles.map(p => [p.id, p]))

  function getMembersForTeam(teamId: string): MemberWithProfile[] {
    return allMembers
      .filter(m => m.team_id === teamId)
      .map(m => ({ ...m, profile: profileById[m.user_id] ?? { id: m.user_id, first_name: '?', last_name: '', role: 'agent' as const, created_at: '' } }))
      .sort((a, b) => (a.role === 'leader' ? -1 : 1) - (b.role === 'leader' ? -1 : 1))
  }

  return (
    <div className="flex flex-col gap-6 pt-6 px-7 pb-7">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize agents into teams.</p>
        </div>
        <NewTeamDialog />
      </div>

      <div className="bg-white rounded-[5px] border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="w-[30px] h-[30px] rounded-[5px] bg-red-50 flex items-center justify-center text-red-600">
            <UsersRound size={20} />
          </div>
          <p className="font-semibold text-base text-gray-800">All Teams</p>
          <span className="text-xs text-gray-400 ml-1">({teams.length})</span>
        </div>

        {teams.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No teams yet. Create one to get started.</p>
        )}

        <div className="divide-y divide-gray-50">
          {teams.map(team => {
            const members = getMembersForTeam(team.id)
            const leader = members.find(m => m.role === 'leader')

            return (
              <div key={team.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-shrink-0">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-[5px] object-cover border border-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-[5px] bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold">
                      {team.name[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{team.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                    {team.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone size={11} />
                        {team.phone}
                      </span>
                    )}
                    {leader && (
                      <span className="text-xs text-gray-400">
                        Leader: {[leader.profile.first_name, leader.profile.last_name].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </div>

                  {members.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      {members.slice(0, 6).map(m => (
                        <div
                          key={m.user_id}
                          title={[m.profile.first_name, m.profile.last_name].filter(Boolean).join(' ')}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${m.role === 'leader' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {(m.profile.first_name?.[0] ?? '?').toUpperCase()}
                        </div>
                      ))}
                      {members.length > 6 && (
                        <span className="text-xs text-gray-400 ml-1">+{members.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <ManageMembersDialog team={team} members={members} allProfiles={allProfiles} />
                  <EditTeamDialog team={team} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
