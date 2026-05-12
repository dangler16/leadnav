import { createClient } from '@/lib/supabase/server'
import { Lead, CallLog, LeadStatus, getLeadDisplayStatus } from '@/lib/types'
import { BarChart2, TrendingUp, Phone, Users } from 'lucide-react'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: leadsData }, { data: callsData }] = await Promise.all([
    supabase.from('leads').select('*').eq('assigned_to', user.id),
    supabase.from('call_logs').select('*').eq('agent_id', user.id),
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

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pipeline performance and sales analytics.</p>
      </div>

      <div className="flex gap-4">
        {[
          { icon: <Users size={18} />, label: 'Total Leads', value: total },
          { icon: <TrendingUp size={18} />, label: `Sales (${conversionRate}%)`, value: sales },
          { icon: <Phone size={18} />, label: 'Contact Rate', value: `${contactRate}%` },
          { icon: <BarChart2 size={18} />, label: 'Total Calls', value: calls.length },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
            <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600 mb-3">
              {s.icon}
            </div>
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
              <Users size={18} />
            </div>
            <p className="font-semibold text-base text-gray-800">Lead Status Breakdown</p>
          </div>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No leads yet</p>
          ) : (
            <div className="space-y-3">
              {statusBreakdown.map(s => (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-medium text-gray-800">{s.count} <span className="text-xs text-gray-400 font-normal">({total > 0 ? ((s.count / total) * 100).toFixed(0) : 0}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color}`}
                      style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
              <Phone size={18} />
            </div>
            <p className="font-semibold text-base text-gray-800">Call Outcomes</p>
          </div>
          {calls.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No calls yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(callOutcomeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([outcome, count]) => (
                  <div key={outcome}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">{outcome.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-800">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${(count / calls.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
              <BarChart2 size={18} />
            </div>
            <p className="font-semibold text-base text-gray-800">Pipeline Summary</p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Active', value: active, color: 'text-green-600' },
              { label: 'Closed', value: closed, color: 'text-amber-600' },
              { label: 'Lost', value: lost, color: 'text-red-600' },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
                <p className="text-xs text-gray-400">{total > 0 ? ((s.value / total) * 100).toFixed(1) : 0}% of total</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
