import { createClient } from '@/lib/supabase/server'
import { Lead, CallLog, LeadStatus, getLeadDisplayStatus, UserRole } from '@/lib/types'
import { BarChart2, Phone, Users } from 'lucide-react'
import { GenerateReportDialog } from './generate-report-dialog'
import { ReportsScopeSelector, AgentOption } from './reports-scope-selector'

function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ agentIds?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  const role = (myProfile?.role ?? 'user') as UserRole
  const isSuperAdmin = role === 'super_admin'
  const isTeamAdmin = role === 'team_admin'
  const isAdmin = isSuperAdmin || isTeamAdmin

  const selectedIds = isAdmin && params.agentIds
    ? params.agentIds.split(',').filter(Boolean)
    : []

  // Resolve team member IDs for team_admin
  let teamMemberIds: string[] = []
  if (isTeamAdmin) {
    const { data: assignments } = await supabase
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', user.id)
    const teamIds = (assignments ?? []).map((a: { team_id: string }) => a.team_id)
    if (teamIds.length > 0) {
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds)
      teamMemberIds = (members ?? []).map((m: { user_id: string }) => m.user_id)
    }
  }

  // Build agent list for selector (admin only)
  let agents: AgentOption[] = []
  if (isAdmin) {
    const myName = [myProfile?.first_name, myProfile?.last_name].filter(Boolean).join(' ') || 'Me'
    const myselfEntry: AgentOption = { id: user.id, name: myName, isMe: true }

    if (isSuperAdmin) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .neq('id', user.id)
        .order('first_name')
      const others = (profiles ?? []).map(p => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
      }))
      agents = [myselfEntry, ...others]
    } else if (isTeamAdmin) {
      const agentIds = teamMemberIds.length > 0 ? teamMemberIds : []
      if (agentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', agentIds)
          .order('first_name')
        const others = (profiles ?? []).map(p => ({
          id: p.id,
          name: [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown',
        }))
        agents = [myselfEntry, ...others]
      } else {
        agents = [myselfEntry]
      }
    }
  }

  // Build scoped queries
  let leadsQuery = supabase.from('leads').select('*')
  let callsQuery = supabase.from('call_logs').select('*')

  if (!isAdmin) {
    leadsQuery = leadsQuery.eq('assigned_to', user.id)
    callsQuery = callsQuery.eq('agent_id', user.id)
  } else if (selectedIds.length > 0) {
    leadsQuery = leadsQuery.in('assigned_to', selectedIds)
    callsQuery = callsQuery.in('agent_id', selectedIds)
  } else if (isTeamAdmin) {
    const safeIds = teamMemberIds.length > 0 ? teamMemberIds : ['00000000-0000-0000-0000-000000000000']
    leadsQuery = leadsQuery.in('assigned_to', safeIds)
    callsQuery = callsQuery.in('agent_id', safeIds)
  }
  // super_admin + no selection = no filter (all data)

  const [{ data: leadsData }, { data: callsData }] = await Promise.all([leadsQuery, callsQuery])

  const leads = (leadsData ?? []) as Lead[]
  const calls = (callsData ?? []) as CallLog[]

  // Lead metrics
  const total = leads.length
  const apptSet = leads.filter(l => l.status === 'appt_set').length
  const apptNoShow = leads.filter(l => l.status === 'appt_no_show').length
  const apptRescheduled = leads.filter(l => l.status === 'appt_rescheduled').length
  const closes = leads.filter(l => l.status === 'sale').length
  const totalLost = leads.filter(l => l.status === 'lost').length
  const active = leads.filter(l => getLeadDisplayStatus(l.status) === 'Active').length
  const closed = leads.filter(l => getLeadDisplayStatus(l.status) === 'Closed').length
  const conversionRate = total > 0 ? ((closes / total) * 100).toFixed(1) : '0.0'
  const contactRate = total > 0
    ? (((leads.filter(l => !['new', 'not_contacted'].includes(l.status)).length) / total) * 100).toFixed(1)
    : '0.0'

  // Call metrics
  const callsWithDuration = calls.filter(c => c.duration_seconds != null && c.duration_seconds > 0)
  const avgDurationSeconds = callsWithDuration.length > 0
    ? Math.round(callsWithDuration.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / callsWithDuration.length)
    : 0
  const callsEndedByLead = calls.filter(c => c.ended_by === 'lead').length
  const callsEndedByAgent = calls.filter(c => c.ended_by === 'agent').length
  const endedByLeadPct = calls.length > 0 ? ((callsEndedByLead / calls.length) * 100).toFixed(1) : '0.0'
  const endedByAgentPct = calls.length > 0 ? ((callsEndedByAgent / calls.length) * 100).toFixed(1) : '0.0'

  const statusBreakdown = (
    [
      { status: 'new' as LeadStatus,              label: 'New',           count: leads.filter(l => l.status === 'new').length,              color: 'bg-blue-500' },
      { status: 'not_contacted' as LeadStatus,    label: 'Not Contacted', count: leads.filter(l => l.status === 'not_contacted').length,    color: 'bg-gray-400' },
      { status: 'contacted' as LeadStatus,        label: 'Contacted',     count: leads.filter(l => l.status === 'contacted').length,        color: 'bg-cyan-500' },
      { status: 'appt_set' as LeadStatus,         label: 'Appt Set',      count: leads.filter(l => l.status === 'appt_set').length,         color: 'bg-indigo-500' },
      { status: 'appt_no_show' as LeadStatus,     label: 'No Show',       count: leads.filter(l => l.status === 'appt_no_show').length,     color: 'bg-yellow-500' },
      { status: 'appt_rescheduled' as LeadStatus, label: 'Rescheduled',   count: leads.filter(l => l.status === 'appt_rescheduled').length, color: 'bg-purple-500' },
      { status: 'appt_no_sale' as LeadStatus,     label: 'No Sale',       count: leads.filter(l => l.status === 'appt_no_sale').length,     color: 'bg-orange-500' },
      { status: 'sale' as LeadStatus,             label: 'Sale',          count: leads.filter(l => l.status === 'sale').length,             color: 'bg-green-500' },
      { status: 'lost' as LeadStatus,             label: 'Lost',          count: leads.filter(l => l.status === 'lost').length,             color: 'bg-red-500' },
    ] as { status: LeadStatus; label: string; count: number; color: string }[]
  ).filter(s => s.count > 0)

  const callOutcomeCounts = calls.reduce((acc, c) => {
    acc[c.outcome] = (acc[c.outcome] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Scope label for report header / PDF
  const allLabel = isSuperAdmin ? 'All Agents' : 'My Team'
  let scopeLabel: string
  if (!isAdmin) {
    scopeLabel = [myProfile?.first_name, myProfile?.last_name].filter(Boolean).join(' ') || 'Me'
  } else if (selectedIds.length === 0) {
    scopeLabel = allLabel
  } else if (selectedIds.length === 1) {
    scopeLabel = agents.find(a => a.id === selectedIds[0])?.name ?? 'Agent'
  } else if (selectedIds.length <= 3) {
    scopeLabel = selectedIds.map(id => agents.find(a => a.id === id)?.name ?? id).join(', ')
  } else {
    scopeLabel = `${selectedIds.length} Agents`
  }

  const reportData = {
    total,
    sales: closes,
    conversionRate,
    contactRate,
    totalCalls: calls.length,
    active,
    closed,
    lost: totalLost,
    statusBreakdown: statusBreakdown.map(s => ({ status: s.status, label: s.label, count: s.count })),
    callOutcomes: Object.entries(callOutcomeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([outcome, count]) => ({ outcome, count })),
    generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }),
    agentName: scopeLabel,
    apptSet,
    apptNoShow,
    apptRescheduled,
    closes,
    avgCallDuration: avgDurationSeconds,
    callsEndedByLead,
    callsEndedByAgent,
    scopeLabel,
  }

  const card = 'bg-card border border-border rounded-lg p-5'
  const sectionTitle = 'text-xs font-semibold text-foreground'

  return (
    <div className="flex flex-col bg-background min-h-full px-8 pt-5 pb-8">

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Reports</h1>
          {isAdmin && (
            <ReportsScopeSelector
              role={role}
              agents={agents}
              selectedIds={selectedIds}
            />
          )}
        </div>
        <GenerateReportDialog data={reportData} />
      </div>

      {/* Row 1: Lead pipeline metrics */}
      <div className="flex gap-3 mb-3">
        {[
          { label: 'total leads',               value: total },
          { label: 'appts set',                 value: apptSet },
          { label: 'no-shows',                  value: apptNoShow },
          { label: 'reschedules',               value: apptRescheduled },
          { label: `closes (${conversionRate}%)`, value: closes },
          { label: 'total lost',                value: totalLost },
        ].map(s => (
          <div key={s.label} className={`flex-1 ${card} flex flex-col gap-2`}>
            <p className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{s.value}</p>
            <p className="text-xs text-muted-foreground leading-none lowercase mt-auto">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Row 2: Call metrics */}
      <div className="flex gap-3 mb-4">
        {[
          { label: 'total calls',       value: calls.length },
          { label: 'avg call duration', value: avgDurationSeconds > 0 ? formatDurationSeconds(avgDurationSeconds) : '—' },
          { label: 'ended by lead',     value: `${endedByLeadPct}%` },
          { label: 'ended by agent',    value: `${endedByAgentPct}%` },
        ].map(s => (
          <div key={s.label} className={`flex-1 ${card} flex flex-col gap-2`}>
            <p className="text-2xl font-semibold leading-none tabular-nums tracking-tight text-foreground" style={{ fontFamily: 'var(--font-mono)' }}>{s.value}</p>
            <p className="text-xs text-muted-foreground leading-none lowercase mt-auto">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">

        {/* Status breakdown */}
        <div className={card}>
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
            <div className="w-4 h-4 flex items-center justify-center text-muted-foreground">
              <Users size={15} />
            </div>
            <p className={sectionTitle}>Lead Status Breakdown</p>
          </div>
          {statusBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No leads yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {statusBreakdown.map(s => (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="text-xs font-medium text-foreground">
                      {s.count} <span className="text-muted-foreground font-normal">({total > 0 ? ((s.count / total) * 100).toFixed(0) : 0}%)</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call outcomes */}
        <div className={card}>
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
            <div className="w-4 h-4 flex items-center justify-center text-muted-foreground">
              <Phone size={15} />
            </div>
            <p className={sectionTitle}>Call Outcomes</p>
          </div>
          {calls.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No calls yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(callOutcomeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([outcome, count]) => (
                  <div key={outcome}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground capitalize">{outcome.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-medium text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${(count / calls.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Pipeline summary */}
        <div className={`col-span-2 ${card}`}>
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
            <div className="w-4 h-4 flex items-center justify-center text-muted-foreground">
              <BarChart2 size={15} />
            </div>
            <p className={sectionTitle}>Pipeline Summary</p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Active', value: active,     color: 'text-green-600' },
              { label: 'Closed', value: closed,     color: 'text-amber-600' },
              { label: 'Lost',   value: totalLost,  color: 'text-red-600' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-2xl font-semibold leading-none tabular-nums tracking-tight ${s.color}`} style={{ fontFamily: 'var(--font-mono)' }}>{s.value}</p>
                <p className="text-xs text-foreground mt-1.5">{s.label}</p>
                <p className="text-xs text-muted-foreground">{total > 0 ? ((s.value / total) * 100).toFixed(1) : 0}% of total</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
