import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Dispute, Lead, Vendor, Profile, UserRole, formatDisputeReason } from '@/lib/types'
import { DisputeStatusBadge } from '@/components/status-badge'
import { NewDisputeDialog } from './new-dispute-dialog'
import { DisputesFilterTabs } from './disputes-filter-tabs'
import { DisputeStatusSelect } from './dispute-status-select'
import { SortableHeader, SortDir } from '@/components/sortable-header'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type DisputeWithLead = Dispute & {
  leads: (Pick<Lead, 'id' | 'firstname' | 'lastname' | 'order_id'> & { vendors: Pick<Vendor, 'name'> | null }) | null
  agentProfile?: Pick<Profile, 'first_name' | 'last_name'> | null
}
type FilterTab = 'All' | 'Active' | 'Resolved' | 'Rejected'

function sortDisputes(data: DisputeWithLead[], col: string | null, dir: SortDir | null): DisputeWithLead[] {
  if (!col || !dir) return data
  return [...data].sort((a, b) => {
    let av: string | null, bv: string | null
    if (col === 'lead')   { av = [a.leads?.firstname, a.leads?.lastname].filter(Boolean).join(' ') || null; bv = [b.leads?.firstname, b.leads?.lastname].filter(Boolean).join(' ') || null }
    else if (col === 'order')  { av = a.leads?.order_id ?? null; bv = b.leads?.order_id ?? null }
    else if (col === 'vendor') { av = a.leads?.vendors?.name ?? null; bv = b.leads?.vendors?.name ?? null }
    else if (col === 'reason') { av = a.reason; bv = b.reason }
    else if (col === 'status') { av = a.status; bv = b.status }
    else if (col === 'notes')  { av = a.notes ?? null; bv = b.notes ?? null }
    else if (col === 'agent')  { av = [a.agentProfile?.first_name, a.agentProfile?.last_name].filter(Boolean).join(' ') || null; bv = [b.agentProfile?.first_name, b.agentProfile?.last_name].filter(Boolean).join(' ') || null }
    else { av = a.created_at; bv = b.created_at }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av.localeCompare(bv)
    return dir === 'asc' ? cmp : -cmp
  })
}

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; sortDir?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter as FilterTab) ?? 'All'
  const sort = params.sort ?? null
  const sortDir = (params.sortDir as SortDir | undefined) ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile?.role ?? 'user') as UserRole
  const canManageStatus = role === 'super_admin' || role === 'team_admin'

  let disputesData: DisputeWithLead[] = []
  let leadsForNew: Pick<Lead, 'id' | 'firstname' | 'lastname'>[] = []

  if (role === 'super_admin') {
    const { data } = await supabase
      .from('disputes')
      .select('*, leads(id, firstname, lastname, order_id, vendors(name))')
      .order('created_at', { ascending: false })
    disputesData = (data ?? []) as DisputeWithLead[]

    const agentIds = [...new Set(disputesData.map(d => d.agent_id))]
    if (agentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', agentIds)
      const profileById = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))
      disputesData = disputesData.map(d => ({ ...d, agentProfile: profileById[d.agent_id] ?? null }))
    }

  } else if (role === 'team_admin') {
    const { data: assignments } = await supabase
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', user.id)
    const myTeamIds = (assignments ?? []).map((a: { team_id: string }) => a.team_id)

    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .in('team_id', myTeamIds.length > 0 ? myTeamIds : ['00000000-0000-0000-0000-000000000000'])
    const myMemberIds = (members ?? []).map((m: { user_id: string }) => m.user_id)

    if (myMemberIds.length > 0) {
      const { data } = await supabase
        .from('disputes')
        .select('*, leads(id, firstname, lastname, order_id, vendors(name))')
        .in('agent_id', myMemberIds)
        .order('created_at', { ascending: false })
      disputesData = (data ?? []) as DisputeWithLead[]

      const agentIds = [...new Set(disputesData.map(d => d.agent_id))]
      if (agentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', agentIds)
        const profileById = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))
        disputesData = disputesData.map(d => ({ ...d, agentProfile: profileById[d.agent_id] ?? null }))
      }
    }

  } else {
    const { data } = await supabase
      .from('disputes')
      .select('*, leads(id, firstname, lastname, order_id, vendors(name))')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false })
    disputesData = (data ?? []) as DisputeWithLead[]

    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, firstname, lastname')
      .eq('assigned_to', user.id)
    leadsForNew = (leadsData ?? []) as Pick<Lead, 'id' | 'firstname' | 'lastname'>[]
  }

  const filtered = sortDisputes(
    disputesData.filter(d => {
      if (filter === 'All')      return true
      if (filter === 'Active')   return d.status === 'open' || d.status === 'in_review'
      if (filter === 'Resolved') return d.status === 'resolved'
      if (filter === 'Rejected') return d.status === 'rejected'
      return true
    }),
    sort, sortDir,
  )

  const counts = {
    All:      disputesData.length,
    Active:   disputesData.filter(d => d.status === 'open' || d.status === 'in_review').length,
    Resolved: disputesData.filter(d => d.status === 'resolved').length,
    Rejected: disputesData.filter(d => d.status === 'rejected').length,
  }

  const showAgentColumn = role === 'super_admin' || role === 'team_admin'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
        {role === 'user' && <NewDisputeDialog leads={leadsForNew} userId={user.id} />}
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
          <DisputesFilterTabs filter={filter} counts={counts} />
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {showAgentColumn && <th className="text-left px-3 py-2.5"><SortableHeader column="agent"  label="Filed By" currentSort={sort} currentDir={sortDir} /></th>}
                <th className="text-left px-3 py-2.5"><SortableHeader column="lead"   label="Lead"     currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="order"  label="Order ID" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="vendor" label="Vendor"   currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="reason" label="Reason"   currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="status" label="Status"   currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="notes"  label="Notes"    currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="date"   label="Filed"    currentSort={sort} currentDir={sortDir} /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showAgentColumn ? 8 : 7} className="py-12 text-center text-sm text-gray-400">No disputes found</td>
                </tr>
              )}
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  {showAgentColumn && (
                    <td className="px-3 py-2.5 text-sm text-gray-900">
                      {d.agentProfile
                        ? [d.agentProfile.first_name, d.agentProfile.last_name].filter(Boolean).join(' ')
                        : <span className="text-gray-400">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-sm font-medium">
                    {d.leads
                      ? <Link href={`/leads/${d.leads.id}`} className="text-gray-900 hover:text-gray-500 transition-colors">{[d.leads.firstname, d.leads.lastname].filter(Boolean).join(' ')}</Link>
                      : <span className="text-gray-900">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {d.leads?.order_id
                      ? <Link href={`/orders/${d.leads.order_id}`} className="font-mono text-xs text-gray-400 hover:text-gray-700 transition-colors">#{d.leads.order_id.slice(0, 8).toUpperCase()}</Link>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{d.leads?.vendors?.name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{formatDisputeReason(d.reason)}</td>
                  <td className="px-3 py-2.5">
                    {canManageStatus
                      ? <DisputeStatusSelect disputeId={d.id} status={d.status} />
                      : <DisputeStatusBadge status={d.status} />}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-900 max-w-[200px] truncate">{d.notes ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">{formatDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
