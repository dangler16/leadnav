import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, Dispute, Vendor, CallLog, Order, formatDisputeReason } from '@/lib/types'
import { LeadStatusBadge, DisputeStatusBadge } from '@/components/status-badge'
import { NewOrderDialog } from '@/app/(dashboard)/orders/new-order-dialog'
import { LeadRowActions } from '@/app/(dashboard)/dashboard/lead-row-actions'
import { SquareUser, AlertCircle, ArrowRight, Phone, Package } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatDayHeader() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const outcomeLabel: Record<string, string> = {
  no_answer:          'No answer',
  voicemail:          'Voicemail left',
  callback_requested: 'Callback requested',
  appointment_set:    'Appointment set',
  contacted:          'Contacted',
  not_interested:     'Not interested',
  wrong_number:       'Wrong number',
  sale:               'Sale',
}

type StatCardProps = { label: string; value: number; href: string }

function StatCard({ label, value, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-2 overflow-hidden hover:bg-gray-50 transition-colors group"
    >
      <p
        className="text-3xl font-semibold leading-none tabular-nums tracking-tight text-gray-900"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </p>
      <p className="text-xs text-gray-400 leading-none lowercase mt-auto">{label}</p>
    </Link>
  )
}

// 5-column grid: order · name · status · date · actions
const leadsGrid = 'grid grid-cols-[0.7fr_1fr_0.8fr_1.2fr_28px]'
const disputesGrid = 'grid grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]'

type ActivityItem =
  | { kind: 'lead';  id: string; text: string; timestamp: string }
  | { kind: 'call';  id: string; text: string; timestamp: string }
  | { kind: 'order'; id: string; text: string; timestamp: string }

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
    { data: recentCalls },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).not('status', 'in', '("lost","sale","appt_no_sale")'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('account_id', user.id).eq('status', 'active'),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('agent_id', user.id).in('status', ['pending', 'active']),
    supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'sale'),
    supabase.from('leads').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('disputes').select('*, leads(firstname, lastname)').eq('agent_id', user.id).in('status', ['pending', 'active']).order('created_at', { ascending: false }).limit(10),
    supabase.from('vendors').select('*'),
    supabase.from('call_logs').select('id, outcome, called_at, leads(firstname, lastname)').eq('agent_id', user.id).order('called_at', { ascending: false }).limit(6),
    supabase.from('orders').select('id, lead_types, created_at').eq('account_id', user.id).order('created_at', { ascending: false }).limit(6),
  ])

  const leads    = (recentLeads  ?? []) as Lead[]
  const disputes = (openDisputes ?? []) as (Dispute & { leads: { firstname: string | null; lastname: string | null } | null })[]
  const vendors  = (vendorData   ?? []) as Vendor[]

  type CallRow = { id: string; outcome: string; called_at: string; leads: { firstname: string | null; lastname: string | null } | { firstname: string | null; lastname: string | null }[] | null }
  const calls  = (recentCalls  ?? []) as unknown as CallRow[]
  const orders = (recentOrders ?? []) as Pick<Order, 'id' | 'lead_types' | 'created_at'>[]

  const activity: ActivityItem[] = [
    ...leads.slice(0, 6).map(l => ({
      kind: 'lead' as const,
      id: l.id,
      text: `Lead received${[l.firstname, l.lastname].filter(Boolean).join(' ') ? ` — ${[l.firstname, l.lastname].filter(Boolean).join(' ')}` : ''}`,
      timestamp: l.created_at,
    })),
    ...calls.map(c => {
      const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads
      const name = lead ? [lead.firstname, lead.lastname].filter(Boolean).join(' ') : null
      return {
        kind: 'call' as const,
        id: c.id,
        text: `Call logged${name ? ` — ${name}` : ''}: ${outcomeLabel[c.outcome] ?? c.outcome}`,
        timestamp: c.called_at,
      }
    }),
    ...orders.map(o => ({
      kind: 'order' as const,
      id: o.id,
      text: `Order placed${o.lead_types?.length ? ` — ${o.lead_types.join(', ')}` : ''}`,
      timestamp: o.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)

  const colHeader = 'text-xs font-medium uppercase tracking-wide text-gray-500'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2 leading-none">{formatDayHeader()}</p>
          <h1 className="text-2xl font-bold text-gray-900 leading-none">Dashboard</h1>
        </div>
        <NewOrderDialog vendors={vendors} userId={user.id} />
      </div>

      {/* Stat Cards */}
      <div className="flex gap-3 px-8 pb-4 shrink-0">
        <StatCard label="active leads"  value={activeLeadCount  ?? 0} href="/leads"    />
        <StatCard label="active orders" value={activeOrderCount ?? 0} href="/orders"   />
        <StatCard label="open disputes" value={openDisputeCount ?? 0} href="/disputes" />
        <StatCard label="calls logged"  value={callCount        ?? 0} href="/calls"    />
        <StatCard label="total sales"   value={conversionCount  ?? 0} href="/reports"  />
      </div>

      {/* Main content: tables + activity */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-8 pb-5 gap-0">

        {/* Tables side by side */}
        <div className="flex gap-8 flex-1 min-h-0 overflow-hidden">

          {/* Recent Leads */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Recent Leads</h2>
              <Link href="/leads" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                View all <ArrowRight size={10} />
              </Link>
            </div>

            <div className={`${leadsGrid} pb-2 border-b border-gray-100 shrink-0`}>
              <span className={colHeader}>Order</span>
              <span className={colHeader}>Name</span>
              <span className={colHeader}>Status</span>
              <span className={colHeader}>Date</span>
              <span />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <SquareUser size={22} className="text-gray-200" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">No leads yet</p>
                  <Link href="/orders" className="text-xs font-medium text-gray-700 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
                    Place an order
                  </Link>
                </div>
              ) : (
                leads.map((lead) => (
                  <div key={lead.id} className={`${leadsGrid} items-center border-b border-gray-100 hover:bg-gray-50 transition-colors group relative`}>
                    <Link href={`/leads/${lead.id}`} className="absolute inset-0" aria-label={`View ${lead.firstname ?? 'lead'}`} />
                    <span className="font-mono text-xs text-gray-400 leading-none py-2.5 pl-0">
                      {lead.order_id ? `#${lead.order_id.slice(0, 4).toUpperCase()}` : '—'}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate pr-2 leading-none py-2.5">
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </span>
                    <span className="py-2.5">
                      <LeadStatusBadge status={lead.status} variant="raw" />
                    </span>
                    <span className="text-xs text-gray-400 truncate leading-none py-2.5">
                      {formatDate(lead.created_at)}
                    </span>
                    <span className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity py-2.5 flex items-center">
                      <LeadRowActions leadId={lead.id} />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-gray-100 self-stretch flex-shrink-0" />

          {/* Open Disputes */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900 tracking-tight">Open Disputes</h2>
              <Link href="/disputes" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                View all <ArrowRight size={10} />
              </Link>
            </div>

            <div className={`${disputesGrid} pb-2 border-b border-gray-100 shrink-0`}>
              <span className={colHeader}>Name</span>
              <span className={colHeader}>Reason</span>
              <span className={colHeader}>Status</span>
              <span className={colHeader}>Date</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {disputes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <AlertCircle size={22} className="text-gray-200" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400">No open disputes</p>
                  <Link href="/disputes" className="text-xs font-medium text-gray-700 border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors">
                    File a dispute
                  </Link>
                </div>
              ) : (
                disputes.map((d) => (
                  <div key={d.id} className={`${disputesGrid} items-center py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors`}>
                    <span className="text-sm font-medium text-gray-900 truncate pr-2 leading-none">
                      {d.leads ? [d.leads.firstname, d.leads.lastname].filter(Boolean).join(' ') : '—'}
                    </span>
                    <span className="text-xs text-gray-500 truncate pr-2 leading-none">
                      {formatDisputeReason(d.reason)}
                    </span>
                    <span>
                      <DisputeStatusBadge status={d.status} />
                    </span>
                    <span className="text-xs text-gray-400 truncate leading-none">
                      {formatDate(d.created_at)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Recent Activity */}
        {activity.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 mt-4 pt-4">
            <h2 className="text-sm font-semibold text-gray-900 tracking-tight mb-2">Recent Activity</h2>
            <div className="overflow-y-auto max-h-44 flex flex-col">
              {activity.map((item, i) => {
                const Icon = item.kind === 'lead' ? SquareUser : item.kind === 'call' ? Phone : Package
                return (
                  <div
                    key={`${item.kind}-${item.id}-${i}`}
                    className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 flex-shrink-0">
                      <Icon size={11} strokeWidth={2} className="text-gray-400" />
                    </div>
                    <span className="flex-1 text-xs text-gray-600 truncate">{item.text}</span>
                    <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">{timeAgo(item.timestamp)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  )
}
