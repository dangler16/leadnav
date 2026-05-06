import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, Dispute, getLeadDisplayStatus, formatDisputeReason } from '@/lib/types'
import { LeadStatusBadge, DisputeStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Phone, Plus, BarChart2, AlertCircle, Users, Package, TrendingUp, ArrowRight } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })
}

function formatDayHeader() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

type StatCardProps = {
  icon: React.ReactNode
  label: string
  sublabel: string
  value: number
  href: string
  linkLabel: string
}

function StatCard({ icon, label, sublabel, value, href, linkLabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <Link href={href} className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700">
        {linkLabel} <ArrowRight size={14} />
      </Link>
    </div>
  )
}

type LeadFilter = 'All' | 'Active' | 'Closed' | 'Lost'
type DisputeFilter = 'All' | 'Active' | 'Closed' | 'Lost'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ leadFilter?: string; disputeFilter?: string }>
}) {
  const params = await searchParams
  const leadFilter = (params.leadFilter as LeadFilter) ?? 'All'
  const disputeFilter = (params.disputeFilter as DisputeFilter) ?? 'All'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { count: activeLeadCount },
    { count: activeOrderCount },
    { count: openDisputeCount },
    { count: callCount },
    { count: conversionCount },
    { data: recentLeads },
    { data: openDisputes },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).not('status', 'in', '("lost","sale","appt_no_sale")'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('account_id', user.id).eq('status', 'active'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('agent_id', user.id).in('status', ['pending', 'active']),
    supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'sale'),
    supabase.from('leads').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('disputes').select('*, leads(firstname, lastname)').eq('agent_id', user.id).in('status', ['pending', 'active']).order('created_at', { ascending: false }).limit(10),
  ])

  const leads = (recentLeads ?? []) as Lead[]
  const disputes = (openDisputes ?? []) as (Dispute & { leads: { firstname: string | null; lastname: string | null } | null })[]

  const filteredLeads = leads.filter(l => {
    if (leadFilter === 'All') return true
    return getLeadDisplayStatus(l.status) === leadFilter
  })

  const filteredDisputes = disputes.filter(d => {
    if (disputeFilter === 'All') return true
    const map: Record<string, string[]> = {
      Active: ['active', 'pending'],
      Closed: ['closed'],
      Lost: ['lost'],
    }
    return map[disputeFilter]?.includes(d.status)
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-red-600 mb-1">{formatDayHeader()}</p>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">View your leads, orders, and disputes from the dashboard.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calls">
            <Button variant="outline" className="flex items-center gap-2">
              <Phone size={15} /> Call Lead
            </Button>
          </Link>
          <Link href="/orders">
            <Button className="flex items-center gap-2">
              <Plus size={15} /> Place Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <BarChart2 size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Pipeline Overview</p>
              <p className="text-xs text-gray-400">View your pipeline statistics</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <StatCard
            icon={<Users size={16} />}
            label="Leads"
            sublabel="Active Leads in Your Pipeline"
            value={activeLeadCount ?? 0}
            href="/leads"
            linkLabel="View Leads"
          />
          <StatCard
            icon={<Package size={16} />}
            label="Orders"
            sublabel="Active Lead Orders"
            value={activeOrderCount ?? 0}
            href="/orders"
            linkLabel="View Orders"
          />
          <StatCard
            icon={<AlertCircle size={16} />}
            label="Disputes"
            sublabel="Total Leads Disputed"
            value={openDisputeCount ?? 0}
            href="/disputes"
            linkLabel="View Disputes"
          />
          <StatCard
            icon={<Phone size={16} />}
            label="Calls"
            sublabel="Calls for Active Leads"
            value={callCount ?? 0}
            href="/calls"
            linkLabel="View Calls"
          />
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Conversions"
            sublabel="Total Lead Conversions"
            value={conversionCount ?? 0}
            href="/reports"
            linkLabel="View Report"
          />
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-5 gap-6">
        {/* Recent Leads */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <Users size={15} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Recent Leads</p>
            </div>
            <Link href="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4">
            {(['All', 'Active', 'Closed', 'Lost'] as LeadFilter[]).map(f => (
              <Link
                key={f}
                href={`/dashboard?leadFilter=${f}&disputeFilter=${disputeFilter}`}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  leadFilter === f
                    ? 'bg-red-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 border border-gray-200'
                }`}
              >
                {f}
              </Link>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Order</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Lead</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-sm text-gray-400">No leads found</td>
                  </tr>
                )}
                {filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">
                      {lead.order_id ? `#${lead.order_id.slice(0, 4).toUpperCase()}` : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-gray-800 hover:text-red-600">
                        {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="py-2.5 text-xs text-gray-400">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open Disputes */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle size={15} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Open Disputes</p>
            </div>
            <Link href="/disputes" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5">
              View All <ArrowRight size={13} />
            </Link>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4">
            {(['All', 'Active', 'Closed', 'Lost'] as DisputeFilter[]).map(f => (
              <Link
                key={f}
                href={`/dashboard?leadFilter=${leadFilter}&disputeFilter=${f}`}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  disputeFilter === f
                    ? 'bg-red-600 text-white'
                    : 'text-gray-500 hover:text-gray-700 border border-gray-200'
                }`}
              >
                {f}
              </Link>
            ))}
          </div>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-3">Lead</th>
                <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-3">Reason</th>
                <th className="text-left text-xs font-medium text-gray-400 pb-2 pr-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDisputes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-gray-400">No disputes found</td>
                </tr>
              )}
              {filteredDisputes.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="py-2.5 pr-3 font-medium text-gray-800 text-xs">
                    {d.leads ? [d.leads.firstname, d.leads.lastname].filter(Boolean).join(' ') : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs">{formatDisputeReason(d.reason)}</td>
                  <td className="py-2.5 pr-3"><DisputeStatusBadge status={d.status} /></td>
                  <td className="py-2.5 text-xs text-gray-400">{formatDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
