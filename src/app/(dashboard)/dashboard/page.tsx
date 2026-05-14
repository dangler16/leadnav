import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, Dispute, Vendor, formatDisputeReason } from '@/lib/types'
import { LeadStatusBadge, DisputeStatusBadge } from '@/components/status-badge'
import { NewOrderDialog } from '@/app/(dashboard)/orders/new-order-dialog'
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
    <div className="flex-1 min-w-0 bg-card border border-border rounded-lg p-4 flex flex-col gap-3 overflow-hidden hover:bg-muted transition-colors">
      <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center text-accent-foreground shrink-0">
        {icon}
      </div>
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-base text-foreground leading-none">{label}</p>
        <p className="text-sm text-muted-foreground leading-none whitespace-nowrap">{sublabel}</p>
      </div>
      <p className="font-bold text-3xl text-foreground leading-none whitespace-nowrap">{value}</p>
      <Link href={href} className="group flex gap-0.5 items-center transition-colors">
        <span className="font-medium text-sm text-red-600 leading-none whitespace-nowrap group-hover:text-red-800 transition-colors">{linkLabel}</span>
        <span className="w-4 h-4 flex items-center justify-center text-red-600 group-hover:text-red-800 transition-colors">
          <ArrowRight size={14} />
        </span>
      </Link>
    </div>
  )
}

export default async function DashboardPage() {
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
    { data: vendorData },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).not('status', 'in', '("lost","sale","appt_no_sale")'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('account_id', user.id).eq('status', 'active'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('agent_id', user.id).in('status', ['pending', 'active']),
    supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'sale'),
    supabase.from('leads').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('disputes').select('*, leads(firstname, lastname)').eq('agent_id', user.id).in('status', ['pending', 'active']).order('created_at', { ascending: false }).limit(10),
    supabase.from('vendors').select('*'),
  ])

  const leads = (recentLeads ?? []) as Lead[]
  const disputes = (openDisputes ?? []) as (Dispute & { leads: { firstname: string | null; lastname: string | null } | null })[]
  const vendors = (vendorData ?? []) as Vendor[]

  const divider = <div className="w-full h-px bg-border/50" />

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">

      {/* Header */}
      <div className="flex items-start justify-between w-full pb-2">
        <div>
          <p className="text-sm font-medium text-red-600 mb-1">{formatDayHeader()}</p>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View your leads, orders, and disputes from the dashboard.</p>
        </div>
        <div className="flex gap-2 items-center shrink-0 -mt-0.25">
          <Link
            href="/calls"
            className="flex items-center px-2 py-1 rounded-sm border border-border bg-card text-foreground text-sm font-medium whitespace-nowrap overflow-hidden hover:bg-muted transition-colors"
          >
            Call Lead
          </Link>
          <NewOrderDialog vendors={vendors} userId={user.id} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-4 w-fulloverflow-hidden">
        <StatCard icon={<Users size={18} />} label="Leads" sublabel="Active Leads in Your Pipeline" value={activeLeadCount ?? 0} href="/leads" linkLabel="View Leads" />
        <StatCard icon={<Package size={18} />} label="Orders" sublabel="Active Lead Orders" value={activeOrderCount ?? 0} href="/orders" linkLabel="View Orders" />
        <StatCard icon={<AlertCircle size={18} />} label="Disputes" sublabel="Total Leads Disputed" value={openDisputeCount ?? 0} href="/disputes" linkLabel="View Disputes" />
        <StatCard icon={<Phone size={18} />} label="Calls" sublabel="Calls for Active Leads" value={callCount ?? 0} href="/calls" linkLabel="View Calls" />
        <StatCard icon={<TrendingUp size={18} />} label="Sales" sublabel="Total Lead Sales" value={conversionCount ?? 0} href="/reports" linkLabel="View Report" />
      </div>

      {/* Tables Row */}
      <div className="flex gap-4 w-full h-full">

        {/* Recent Leads */}
        <div className="flex-1 min-w-0 bg-card border border-border rounded-lg p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center text-accent-foreground shrink-0">
                <Users size={18} />
              </div>
              <span className="font-semibold text-base text-foreground leading-none whitespace-nowrap">Recent Leads</span>
            </div>
            <Link
              href="/leads"
              className="flex items-center px-2 py-1 rounded-sm border border-border bg-card text-foreground text-sm font-medium whitespace-nowrap overflow-hidden hover:bg-muted transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-start justify-between w-full">
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Order</span>
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Lead</span>
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Status</span>
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Date</span>
              </div>
              {divider}
            </div>

            {leads.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No leads found</p>
            )}

            {leads.map((lead, i) => (
              <div key={lead.id}>
                <Link href={`/leads/${lead.id}`} className="flex items-center justify-between w-full py-2 hover:bg-muted transition-colors cursor-pointer">
                  <span className="flex-1 min-w-0 font-mono text-sm text-muted-foreground leading-none">
                    {lead.order_id ? `#${lead.order_id.slice(0, 4).toUpperCase()}` : '—'}
                  </span>
                  <span className="flex-1 min-w-0 font-medium text-sm text-foreground leading-none">
                    <span>
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <LeadStatusBadge status={lead.status} variant="raw" />
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-muted-foreground leading-none">
                    {formatDate(lead.created_at)}
                  </span>
                </Link>
                {i < leads.length && divider}
              </div>
            ))}
          </div>
        </div>

        {/* Open Disputes */}
        <div className="flex-1 min-w-0 bg-card border border-border rounded-lg p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center text-accent-foreground shrink-0">
                <AlertCircle size={18} />
              </div>
              <span className="font-semibold text-base text-foreground leading-none whitespace-nowrap">Open Disputes</span>
            </div>
            <Link
              href="/disputes"
              className="flex items-center px-2 py-1 rounded-sm border border-border bg-card text-foreground text-sm font-medium whitespace-nowrap overflow-hidden hover:bg-muted transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-start justify-between w-full">
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Lead</span>
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Reason</span>
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Status</span>
                <span className="flex-1 min-w-0 font-medium text-sm text-muted-foreground leading-none">Date</span>
              </div>
              {divider}
            </div>

            {disputes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No disputes found</p>
            )}

            {disputes.map((d, i) => (
              <div key={d.id}>
                <div className="flex items-center justify-between w-full py-2 hover:bg-muted transition-colors cursor-pointer">
                  <span className="flex-1 min-w-0 font-medium text-sm text-foreground leading-none">
                    {d.leads ? [d.leads.firstname, d.leads.lastname].filter(Boolean).join(' ') : '—'}
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-muted-foreground leading-none">
                    {formatDisputeReason(d.reason)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <DisputeStatusBadge status={d.status} />
                  </span>
                  <span className="flex-1 min-w-0 text-sm text-muted-foreground leading-none">
                    {formatDate(d.created_at)}
                  </span>
                </div>
                {i < disputes.length && divider}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
