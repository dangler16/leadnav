import { createClient } from '@/lib/supabase/server'
import { Lead, CallLog, LeadStatus, getLeadDisplayStatus } from '@/lib/types'
import { BarChart2, Phone, Users } from 'lucide-react'
import { GenerateReportDialog } from './generate-report-dialog'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: leadsData }, { data: callsData }, { data: profileData }] = await Promise.all([
    supabase.from('leads').select('*').eq('assigned_to', user.id),
    supabase.from('call_logs').select('*').eq('agent_id', user.id),
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
  ])

  const leads = (leadsData ?? []) as Lead[]
  const calls = (callsData ?? []) as CallLog[]

  const total = leads.length
  const active = leads.filter(l => getLeadDisplayStatus(l.status) === 'Active').length
  const closed = leads.filter(l => getLeadDisplayStatus(l.status) === 'Closed').length
  const lost = leads.filter(l => getLeadDisplayStatus(l.status) === 'Lost').length
  const sales = leads.filter(l => l.status === 'sale').length
  const conversionRate = total > 0 ? ((sales / total) * 100).toFixed(1) : '0.0'
  const contactRate = total > 0
    ? (((leads.filter(l => !['new', 'not_contacted'].includes(l.status)).length) / total) * 100).toFixed(1)
    : '0.0'

  const statusBreakdown: { status: LeadStatus; label: string; count: number; color: string }[] = (
    [
      { status: 'new' as LeadStatus, label: 'New', count: leads.filter(l => l.status === 'new').length, color: 'bg-blue-500' },
      { status: 'not_contacted' as LeadStatus, label: 'Not Contacted', count: leads.filter(l => l.status === 'not_contacted').length, color: 'bg-gray-400' },
      { status: 'contacted' as LeadStatus, label: 'Contacted', count: leads.filter(l => l.status === 'contacted').length, color: 'bg-cyan-500' },
      { status: 'appt_set' as LeadStatus, label: 'Appt Set', count: leads.filter(l => l.status === 'appt_set').length, color: 'bg-indigo-500' },
      { status: 'appt_no_show' as LeadStatus, label: 'No Show', count: leads.filter(l => l.status === 'appt_no_show').length, color: 'bg-yellow-500' },
      { status: 'appt_rescheduled' as LeadStatus, label: 'Rescheduled', count: leads.filter(l => l.status === 'appt_rescheduled').length, color: 'bg-purple-500' },
      { status: 'appt_no_sale' as LeadStatus, label: 'No Sale', count: leads.filter(l => l.status === 'appt_no_sale').length, color: 'bg-orange-500' },
      { status: 'sale' as LeadStatus, label: 'Sale', count: leads.filter(l => l.status === 'sale').length, color: 'bg-green-500' },
      { status: 'lost' as LeadStatus, label: 'Lost', count: leads.filter(l => l.status === 'lost').length, color: 'bg-red-500' },
    ] as { status: LeadStatus; label: string; count: number; color: string }[]
  ).filter(s => s.count > 0)

  const callOutcomeCounts = calls.reduce((acc, c) => {
    acc[c.outcome] = (acc[c.outcome] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const profile = profileData as { first_name: string | null; last_name: string | null } | null
  const agentName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')

  const reportData = {
    total,
    sales,
    conversionRate,
    contactRate,
    totalCalls: calls.length,
    active,
    closed,
    lost,
    statusBreakdown: statusBreakdown.map(s => ({ status: s.status, label: s.label, count: s.count })),
    callOutcomes: Object.entries(callOutcomeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([outcome, count]) => ({ outcome, count })),
    generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }),
    agentName,
  }

  const card = 'bg-card border border-border rounded-lg p-5'
  const sectionTitle = 'text-xs font-semibold text-foreground'

  return (
    <div className="flex flex-col bg-background min-h-full px-8 pt-5 pb-8">

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <GenerateReportDialog data={reportData} />
      </div>

      {/* Stat cards */}
      <div className="flex gap-3 mb-4">
        {[
          { label: 'total leads',            value: total },
          { label: `sales (${conversionRate}%)`, value: sales },
          { label: 'contact rate',           value: `${contactRate}%` },
          { label: 'total calls',            value: calls.length },
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
                    <span className="text-xs font-medium text-foreground">{s.count} <span className="text-muted-foreground font-normal">({total > 0 ? ((s.count / total) * 100).toFixed(0) : 0}%)</span></span>
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
              { label: 'Active', value: active, color: 'text-green-600' },
              { label: 'Closed', value: closed, color: 'text-amber-600' },
              { label: 'Lost', value: lost, color: 'text-red-600' },
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
