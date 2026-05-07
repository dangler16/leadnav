import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, Dispute, getLeadDisplayStatus, formatDisputeReason } from '@/lib/types'
import { Users, Package, AlertCircle, Phone, TrendingUp, ArrowRight } from 'lucide-react'

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
    <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-[5px] p-5 flex flex-col gap-5 overflow-hidden">
      <div className="w-[30px] h-[30px] bg-red-50 rounded-[5px] flex items-center justify-center text-red-600 shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-[10px]">
        <p className="font-semibold text-base text-gray-800 leading-none">{label}</p>
        <p className="text-xs text-gray-400 leading-none whitespace-nowrap">{sublabel}</p>
      </div>
      <p className="font-bold text-[28px] text-gray-900 leading-none whitespace-nowrap">{value}</p>
      <Link href={href} className="flex gap-0.5 items-center">
        <span className="font-medium text-sm text-red-600 leading-none whitespace-nowrap">{linkLabel}</span>
        <span className="w-4 h-4 flex items-center justify-center text-red-600">
          <ArrowRight size={14} />
        </span>
      </Link>
    </div>
  )
}

function LeadBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    Active: 'bg-[rgba(18,234,25,0.2)] text-[#06960a]',
    Closed: 'bg-[rgba(234,18,18,0.1)] text-[#ea1212]',
    Lost: 'bg-[rgba(234,18,18,0.1)] text-[#ea1212]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-[6px] rounded-[3px] font-medium text-xs leading-none ${variants[status] ?? variants.Active}`}>
      {status}
    </span>
  )
}

function DisputeBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: 'bg-[rgba(18,234,25,0.2)] text-[#06960a]',
    active: 'bg-[rgba(18,234,25,0.2)] text-[#06960a]',
    closed: 'bg-[rgba(234,18,18,0.1)] text-[#ea1212]',
    lost: 'bg-[rgba(234,18,18,0.1)] text-[#ea1212]',
  }
  const labels: Record<string, string> = {
    pending: 'Pending',
    active: 'Active',
    closed: 'Closed',
    lost: 'Lost',
  }
  return (
    <span className={`inline-flex items-center px-2 py-[6px] rounded-[3px] font-medium text-xs leading-none ${variants[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}

type LeadFilter = 'All' | 'Active' | 'Closed' | 'Lost'
type DisputeFilter = 'All' | 'Active' | 'Closed' | 'Lost'

export default async function DashboardSamplePage({
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

  const divider = <div className="w-full h-px bg-gray-100" />

  return (
    <div className="flex flex-col gap-6 pt-6 px-7 pb-7">

      {/* Header */}
      <div className="flex items-start justify-between w-full">
        <div>
          <p className="text-sm font-medium text-red-600 mb-1">{formatDayHeader()}</p>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">View your leads, orders, and disputes from the dashboard.</p>
        </div>
        <div className="flex gap-[10px] items-center shrink-0">
          <Link
            href="/calls"
            className="flex items-center px-2 py-1.5 rounded-[3px] border border-gray-200 bg-white text-gray-600 text-xs whitespace-nowrap overflow-hidden"
          >
            Call Lead
          </Link>
          <Link
            href="/orders"
            className="flex items-center px-2 py-1.5 rounded-[3px] bg-red-600 text-white text-xs whitespace-nowrap overflow-hidden"
          >
            Place Order
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-6 w-full overflow-hidden">
        <StatCard icon={<Users size={20} />} label="Leads" sublabel="Active Leads in Your Pipeline" value={activeLeadCount ?? 0} href="/leads" linkLabel="View Leads" />
        <StatCard icon={<Package size={20} />} label="Orders" sublabel="Active Lead Orders" value={activeOrderCount ?? 0} href="/orders" linkLabel="View Orders" />
        <StatCard icon={<AlertCircle size={20} />} label="Disputes" sublabel="Total Leads Disputed" value={openDisputeCount ?? 0} href="/disputes" linkLabel="View Disputes" />
        <StatCard icon={<Phone size={20} />} label="Calls" sublabel="Calls for Active Leads" value={callCount ?? 0} href="/calls" linkLabel="View Calls" />
        <StatCard icon={<TrendingUp size={20} />} label="Conversions" sublabel="Total Lead Conversions" value={conversionCount ?? 0} href="/reports" linkLabel="View Report" />
      </div>

      {/* Tables Row */}
      <div className="flex gap-6 w-full">

        {/* Recent Leads */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-[5px] p-5 flex flex-col gap-5 overflow-hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-[10px] items-center">
              <div className="w-[30px] h-[30px] bg-red-50 rounded-[5px] flex items-center justify-center text-red-600 shrink-0">
                <Users size={20} />
              </div>
              <span className="font-semibold text-base text-gray-800 leading-none whitespace-nowrap">Recent Leads</span>
            </div>
            <Link
              href="/leads"
              className="flex items-center px-2 py-1.5 rounded-[3px] border border-gray-200 bg-white text-gray-600 text-xs whitespace-nowrap overflow-hidden"
            >
              View All
            </Link>
          </div>

          {/* Table */}
          <div className="flex flex-col gap-[5px] w-full">
            <div className="flex flex-col gap-[10px] w-full">
              <div className="flex items-start justify-between w-full">
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Order</span>
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Lead</span>
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Status</span>
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Date</span>
              </div>
              {divider}
            </div>

            {filteredLeads.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">No leads found</p>
            )}

            {filteredLeads.map((lead, i) => (
              <div key={lead.id}>
                <div className="flex items-center justify-between w-full py-[5px]">
                  <span className="flex-1 min-w-0 font-mono text-xs text-gray-500 leading-none">
                    {lead.order_id ? `#${lead.order_id.slice(0, 4).toUpperCase()}` : '—'}
                  </span>
                  <span className="flex-1 min-w-0 font-medium text-xs text-gray-800 leading-none">
                    <Link href={`/leads/${lead.id}`} className="hover:text-red-600">
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </Link>
                  </span>
                  <span className="flex-1 min-w-0">
                    <LeadBadge status={getLeadDisplayStatus(lead.status)} />
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">
                    {formatDate(lead.created_at)}
                  </span>
                </div>
                {i < filteredLeads.length - 1 && divider}
              </div>
            ))}
          </div>
        </div>

        {/* Open Disputes */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-[5px] p-5 flex flex-col gap-5 overflow-hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-[10px] items-center">
              <div className="w-[30px] h-[30px] bg-red-50 rounded-[5px] flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle size={20} />
              </div>
              <span className="font-semibold text-base text-gray-800 leading-none whitespace-nowrap">Open Disputes</span>
            </div>
            <Link
              href="/disputes"
              className="flex items-center px-2 py-1.5 rounded-[3px] border border-gray-200 bg-white text-gray-600 text-xs whitespace-nowrap overflow-hidden"
            >
              View All
            </Link>
          </div>

          {/* Table */}
          <div className="flex flex-col gap-[5px] w-full">
            <div className="flex flex-col gap-[10px] w-full">
              <div className="flex items-start justify-between w-full">
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Lead</span>
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Reason</span>
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Status</span>
                <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">Date</span>
              </div>
              {divider}
            </div>

            {filteredDisputes.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">No disputes found</p>
            )}

            {filteredDisputes.map((d, i) => (
              <div key={d.id}>
                <div className="flex items-center justify-between w-full py-[5px]">
                  <span className="flex-1 min-w-0 font-medium text-xs text-gray-800 leading-none">
                    {d.leads ? [d.leads.firstname, d.leads.lastname].filter(Boolean).join(' ') : '—'}
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-gray-500 leading-none">
                    {formatDisputeReason(d.reason)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <DisputeBadge status={d.status} />
                  </span>
                  <span className="flex-1 min-w-0 text-xs text-gray-400 leading-none">
                    {formatDate(d.created_at)}
                  </span>
                </div>
                {i < filteredDisputes.length - 1 && divider}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
