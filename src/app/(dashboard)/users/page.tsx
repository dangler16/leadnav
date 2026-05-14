import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Profile, Team, TeamMember } from '@/lib/types'
import { redirect } from 'next/navigation'
import { Users, ShieldCheck } from 'lucide-react'
import { EditUserDialog } from './edit-user-dialog'
import { badgeShape } from '@/components/ui/badge'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'admin') redirect('/dashboard')

  const [{ data: profilesData }, { data: teamsData }, { data: membersData }] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    supabase.from('teams').select('*').order('name'),
    supabase.from('team_members').select('*'),
  ])

  const profiles = (profilesData ?? []) as Profile[]
  const teams = (teamsData ?? []) as Team[]
  const allMembers = (membersData ?? []) as TeamMember[]

  const service = createServiceClient()
  const { data: { users: authUsers } } = await service.auth.admin.listUsers()
  const emailById = Object.fromEntries(authUsers.map(u => [u.id, u.email ?? '']))

  const teamsByUserId: Record<string, Team[]> = {}
  for (const m of allMembers) {
    const team = teams.find(t => t.id === m.team_id)
    if (!team) continue
    if (!teamsByUserId[m.user_id]) teamsByUserId[m.user_id] = []
    teamsByUserId[m.user_id].push(team)
  }

  const memberTeamIdsByUser: Record<string, string[]> = {}
  for (const m of allMembers) {
    if (!memberTeamIdsByUser[m.user_id]) memberTeamIdsByUser[m.user_id] = []
    memberTeamIdsByUser[m.user_id].push(m.team_id)
  }

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage agents and user roles.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Name</th>
              <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Email</th>
              <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Teams</th>
              <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Role</th>
              <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Joined</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {profiles.map(p => {
              const userTeams = teamsByUserId[p.id] ?? []
              return (
                <tr key={p.id} className="hover:bg-neutral-100 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
                        {(p.first_name?.[0] ?? '?').toUpperCase()}
                      </div>
                      <p className="font-medium text-gray-800">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{emailById[p.id] ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {userTeams.length === 0 ? (
                        <span className="text-xs text-gray-300">—</span>
                      ) : userTeams.map(t => (
                        <span key={t.id} className={`${badgeShape} bg-blue-50 text-blue-700`}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`${badgeShape} gap-1 ${p.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.role === 'admin' && <ShieldCheck size={11} />}
                      {p.role === 'admin' ? 'Admin' : 'Agent'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-400">{formatDate(p.created_at)}</td>
                  <td className="px-3 py-2">
                    <EditUserDialog
                      profile={p}
                      email={emailById[p.id] ?? ''}
                      teams={teams}
                      memberTeamIds={memberTeamIdsByUser[p.id] ?? []}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
