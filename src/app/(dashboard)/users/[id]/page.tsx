import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Lead, Dispute, Profile, UserRole, formatLeadStatusLabel, formatDisputeReason } from '@/lib/types'
import { ChevronLeft } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { DisputeStatusBadge } from '@/components/status-badge'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPhone(phone: string | null) {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  const d = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits
  if (d.length !== 10) return phone
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const roleConfig: Record<UserRole, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  team_admin:  { label: 'Team Admin',  className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  user:        { label: 'User',        className: 'bg-muted text-muted-foreground' },
}

const statusColors: Record<string, string> = {
  new:              'text-blue-600',
  not_contacted:    'text-gray-500',
  contacted:        'text-cyan-600',
  appt_set:         'text-indigo-600',
  appt_no_show:     'text-yellow-600',
  appt_no_sale:     'text-orange-600',
  appt_rescheduled: 'text-purple-600',
  sale:             'text-green-600',
  lost:             'text-red-500',
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: targetUserId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || (myProfile.role !== 'super_admin' && myProfile.role !== 'team_admin')) redirect('/dashboard')

  const service = createServiceClient()

  const [{ data: profileData }, leadsResult, disputesResult, teamsResult, membersResult] = await Promise.all([
    service.from('profiles').select('*').eq('id', targetUserId).single(),
    supabase.from('leads').select('*, vendors(name)').eq('assigned_to', targetUserId).order('created_at', { ascending: false }),
    supabase.from('disputes').select('*, leads(id, firstname, lastname)').eq('agent_id', targetUserId).order('created_at', { ascending: false }),
    supabase.from('teams').select('*'),
    supabase.from('team_members').select('*').eq('user_id', targetUserId),
  ])

  if (!profileData) notFound()
  const profile = profileData as Profile

  const { data: authData } = await service.auth.admin.getUserById(targetUserId)
  const email = authData?.user?.email ?? ''

  const leads = (leadsResult.data ?? []) as (Lead & { vendors: { name: string } | null })[]
  const disputes = (disputesResult.data ?? []) as (Dispute & { leads: { id: string; firstname: string | null; lastname: string | null } | null })[]
  const teams = teamsResult.data ?? []
  const membership = membersResult.data?.[0]
  const userTeam = membership ? teams.find(t => t.id === membership.team_id) : null

  const role = profile.role as UserRole
  const roleStyle = roleConfig[role]
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || '—'

  return (
    <div className="flex flex-col gap-6 pt-6 px-7 pb-7 h-full overflow-auto">

      {/* Back */}
      <div>
        <Link href="/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft size={15} />
          Users
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-sm font-bold shrink-0">
            {(profile.first_name?.[0] ?? '?').toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {email && <span className="text-sm text-muted-foreground">{email}</span>}
              <span className={`${badgeShape} ${roleStyle.className}`}>{roleStyle.label}</span>
              {userTeam && <span className={`${badgeShape} bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400`}>{userTeam.name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Leads */}
      <div className="flex flex-col bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Leads</h2>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Name</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Status</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Vendor</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Phone</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">State</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400">No leads assigned.</td>
                </tr>
              )}
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-muted transition-colors">
                  <td className="px-3 py-2">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-foreground hover:text-red-600 transition-colors">
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </Link>
                  </td>
                  <td className={`px-3 py-2 text-sm font-medium ${statusColors[lead.status] ?? 'text-gray-600'}`}>
                    {formatLeadStatusLabel(lead.status)}
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{lead.vendors?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{formatPhone(lead.phone)}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{lead.state ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disputes */}
      <div className="flex flex-col bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Disputes</h2>
          <span className="text-xs text-gray-400">{disputes.length}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Lead</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Reason</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Status</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Notes</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {disputes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">No disputes filed.</td>
                </tr>
              )}
              {disputes.map(dispute => (
                <tr key={dispute.id} className="hover:bg-muted transition-colors">
                  <td className="px-3 py-2">
                    {dispute.leads ? (
                      <Link href={`/leads/${dispute.leads.id}`} className="text-foreground hover:text-red-600 transition-colors">
                        {[dispute.leads.firstname, dispute.leads.lastname].filter(Boolean).join(' ') || '—'}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{formatDisputeReason(dispute.reason)}</td>
                  <td className="px-3 py-2"><DisputeStatusBadge status={dispute.status} /></td>
                  <td className="px-3 py-2 text-sm text-muted-foreground max-w-[200px] truncate">{dispute.notes ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(dispute.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
