import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Lead, Dispute, Profile, UserRole, formatLeadStatusLabel, formatDisputeReason } from '@/lib/types'
import { ChevronLeft } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { LeadStatusBadge, DisputeStatusBadge } from '@/components/status-badge'
import { cn } from '@/lib/utils'

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
  super_admin: { label: 'Super Admin', className: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  team_admin:  { label: 'Team Admin',  className: 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' },
  user:        { label: 'User',        className: 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700' },
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

  const colHeader = 'text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground px-3 py-2.5'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* Header */}
      <div className="px-8 pt-5 pb-4 shrink-0 border-b border-border">
        <Link href="/users" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ChevronLeft size={13} /> Back to Users
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground text-[14px] font-bold shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              (profile.first_name?.[0] ?? '?').toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-none ">{fullName}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              {email && <span className="text-xs text-muted-foreground">{email}</span>}
              <span className={cn(badgeShape, roleStyle.className)}>{roleStyle.label}</span>
              {userTeam && <span className={cn(badgeShape, 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800')}>{userTeam.name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-5">

      {/* Leads table */}
      <div className="flex flex-col border border-border rounded overflow-hidden mb-4">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-semibold text-foreground ">Leads</h2>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={colHeader}>Name</th>
                <th className={colHeader}>Status</th>
                <th className={colHeader}>Vendor</th>
                <th className={colHeader}>Phone</th>
                <th className={colHeader}>State</th>
                <th className={colHeader}>Date</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">No leads assigned.</td>
                </tr>
              )}
              {leads.map(lead => (
                <tr key={lead.id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="px-3 py-2.5">
                    <Link href={`/leads/${lead.id}`} className="text-xs font-medium text-foreground hover:text-muted-foreground transition-colors">
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <LeadStatusBadge status={lead.status} variant="raw" />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{lead.vendors?.name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatPhone(lead.phone)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{lead.state ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disputes table */}
      <div className="flex flex-col border border-border rounded overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-semibold text-foreground ">Disputes</h2>
          <span className="text-xs text-muted-foreground">{disputes.length}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={colHeader}>Lead</th>
                <th className={colHeader}>Reason</th>
                <th className={colHeader}>Status</th>
                <th className={colHeader}>Notes</th>
                <th className={colHeader}>Date</th>
              </tr>
            </thead>
            <tbody>
              {disputes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">No disputes filed.</td>
                </tr>
              )}
              {disputes.map(dispute => (
                <tr key={dispute.id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="px-3 py-2.5">
                    {dispute.leads ? (
                      <Link href={`/leads/${dispute.leads.id}`} className="text-xs text-foreground hover:text-muted-foreground transition-colors">
                        {[dispute.leads.firstname, dispute.leads.lastname].filter(Boolean).join(' ') || '—'}
                      </Link>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDisputeReason(dispute.reason)}</td>
                  <td className="px-3 py-2.5"><DisputeStatusBadge status={dispute.status} /></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{dispute.notes ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(dispute.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </div>{/* end scrollable content */}
    </div>
  )
}
