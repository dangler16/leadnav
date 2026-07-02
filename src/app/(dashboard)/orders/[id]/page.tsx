import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Order, OrderAgent, Profile, UserRole, Vendor, Lead, LeadStatus } from '@/lib/types'
import { OrderStatusSelect } from '../order-status-select'
import { OrderLeadsFilterTabs } from './order-leads-filter-tabs'
import { EditOrderDialog } from './edit-order-dialog'
import { ChevronLeft } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const leadStatusConfig: Record<LeadStatus, { label: string; className: string; dotClass: string }> = {
  new:              { label: 'new',           className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',       dotClass: 'bg-blue-500' },
  not_contacted:    { label: 'not contacted', className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',       dotClass: 'bg-gray-400 dark:bg-gray-500' },
  contacted:        { label: 'contacted',     className: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',       dotClass: 'bg-cyan-500' },
  appt_set:         { label: 'appt set',      className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800', dotClass: 'bg-indigo-500' },
  appt_no_show:     { label: 'no show',       className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', dotClass: 'bg-yellow-500' },
  appt_no_sale:     { label: 'no sale',       className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', dotClass: 'bg-orange-500' },
  appt_rescheduled: { label: 'rescheduled',   className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800', dotClass: 'bg-purple-500' },
  sale:             { label: 'sale',          className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', dotClass: 'bg-green-500' },
  lost:             { label: 'lost',          className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',             dotClass: 'bg-red-500' },
}

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatPhone(phone: string | null) {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  const d = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits
  if (d.length !== 10) return phone
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

type LeadStatusFilter = 'all' | LeadStatus
type AgentWithProfile = OrderAgent & { profile: Profile }

const leadTabs: { value: LeadStatusFilter; label: string }[] = [
  { value: 'all',               label: 'All' },
  { value: 'new',               label: 'New' },
  { value: 'not_contacted',     label: 'Not Contacted' },
  { value: 'contacted',         label: 'Contacted' },
  { value: 'appt_set',          label: 'Appt Set' },
  { value: 'appt_no_show',      label: 'No-Show' },
  { value: 'appt_no_sale',      label: 'No-Sale' },
  { value: 'appt_rescheduled',  label: 'Rescheduled' },
  { value: 'sale',              label: 'Sale' },
  { value: 'lost',              label: 'Lost' },
]

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filter?: string }>
}) {
  const { id } = await params
  const { filter: filterParam } = await searchParams
  const filter = (filterParam as LeadStatusFilter) ?? 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (myProfileData?.role ?? 'user') as UserRole
  const isSuperAdmin = role === 'super_admin'
  const isTeamAdmin = role === 'team_admin'
  const isAdmin = isSuperAdmin || isTeamAdmin

  const { data: orderData } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!orderData) notFound()

  const service = createServiceClient()
  const [{ data: leadsData }, { data: agentsData }] = await Promise.all([
    service.from('leads').select('*').eq('order_id', id).order('created_at', { ascending: false }),
    service.from('order_agents').select('*').eq('order_id', id),
  ])

  const order = orderData as Order
  const leads = (leadsData ?? []) as Lead[]
  const rawAgents = (agentsData ?? []) as OrderAgent[]

  let agentProfiles: Profile[] = []
  let orderableProfiles: Profile[] = []
  let memberIds: string[] = []

  const extraProfileIds = [order.account_id, order.placed_by].filter((profileId): profileId is string => Boolean(profileId))
  const agentUserIds = rawAgents.map(agent => agent.user_id)
  const allProfileIds = [...new Set([...agentUserIds, ...extraProfileIds])]
  if (allProfileIds.length > 0) {
    const { data } = await service.from('profiles').select('*').in('id', allProfileIds)
    agentProfiles = (data ?? []) as Profile[]
  }

  if (isSuperAdmin) {
    const { data } = await service.from('profiles').select('*').neq('id', user.id).order('first_name')
    orderableProfiles = (data ?? []) as Profile[]
  } else if (isTeamAdmin) {
    const { data: assignments } = await supabase
      .from('team_admin_assignments').select('team_id').eq('user_id', user.id)
    const teamIds = (assignments ?? []).map((assignment: { team_id: string }) => assignment.team_id)
    if (teamIds.length > 0) {
      const { data: membersData } = await service.from('team_members').select('user_id').in('team_id', teamIds)
      memberIds = (membersData ?? []).map((member: { user_id: string }) => member.user_id)
      if (memberIds.length > 0) {
        const { data } = await service.from('profiles').select('*').in('id', memberIds).order('first_name')
        orderableProfiles = (data ?? []) as Profile[]
      }
    }
  }

  const profileById = Object.fromEntries(agentProfiles.map(profile => [profile.id, profile]))
  const agents: AgentWithProfile[] = rawAgents.map(agent => ({
    ...agent,
    profile: profileById[agent.user_id] ?? { id: agent.user_id, first_name: '?', last_name: '', role: 'user' as const, wallet_balance_cents: 0, stripe_customer_id: null, created_at: '' },
  }))

  const accountProfile = order.account_id ? profileById[order.account_id] : null
  const accountName = accountProfile
    ? [accountProfile.first_name, accountProfile.last_name].filter(Boolean).join(' ') || '—'
    : null
  const placedByProfile = order.placed_by ? profileById[order.placed_by] : null
  const placedByName = placedByProfile
    ? [placedByProfile.first_name, placedByProfile.last_name].filter(Boolean).join(' ') || '—'
    : null

  let vendor: Vendor | null = null
  if (order.vendor_id) {
    const { data } = await service.from('vendors').select('*').eq('id', order.vendor_id).single()
    vendor = data as Vendor | null
  }

  const isEditable = order.status === 'active' || order.status === 'paused'

  function leadEffectiveCost(leadType: string | null): number {
    if (!vendor) return 0
    if (leadType && vendor.lead_type_costs[leadType] != null) return vendor.lead_type_costs[leadType]
    return vendor.cost_per_lead ?? 0
  }

  const orderLeadTypes = order.lead_types.length > 0 ? order.lead_types : (order.lead_type ? [order.lead_type] : [])
  const orderCosts = orderLeadTypes.map(leadType => leadEffectiveCost(leadType)).filter(cost => cost > 0)
  const minCost = orderCosts.length ? Math.min(...orderCosts) : 0
  const maxCost = orderCosts.length ? Math.max(...orderCosts) : 0
  const costDisplay = orderCosts.length === 0
    ? '—'
    : minCost === maxCost
      ? `$${minCost.toLocaleString('en-US')}`
      : `$${minCost.toLocaleString('en-US')}–$${maxCost.toLocaleString('en-US')}`

  const totalSpend = leads.reduce((sum, lead) => sum + leadEffectiveCost(lead.lead_type), 0)

  const counts = leadTabs.reduce((accumulator, tab) => {
    accumulator[tab.value] = tab.value === 'all' ? leads.length : leads.filter(lead => lead.status === tab.value).length
    return accumulator
  }, {} as Record<LeadStatusFilter, number>)

  const filteredLeads = filter === 'all' ? leads : leads.filter(lead => lead.status === filter)

  const colHeader = 'text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5'
  const detailRow = 'flex justify-between items-center px-4 py-3 border-b border-border'
  const dt = 'text-xs text-muted-foreground'
  const dd = 'text-xs font-medium text-foreground'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="px-8 pt-5 pb-4 shrink-0 border-b border-border">
        <Link href="/orders" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ChevronLeft size={13} /> Back to Orders
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-xs text-muted-foreground mt-1.5">Placed {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-8 py-5">
        <div className="grid grid-cols-3 gap-4 h-full">
          <div className="bg-card border border-border rounded-lg col-span-1 overflow-auto flex flex-col">
            <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Order Details</p>
              {isEditable && (
                <EditOrderDialog
                  order={order}
                  agents={agents}
                  orderableProfiles={orderableProfiles}
                />
              )}
            </div>

            <div className="grid grid-cols-3 border-b border-border shrink-0">
              <div className="px-4 py-3 border-r border-border">
                <p className="text-xs text-muted-foreground mb-1">Leads</p>
                <p className="text-xl font-semibold text-foreground leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{leads.length}</p>
              </div>
              <div className="px-4 py-3 border-r border-border">
                <p className="text-xs text-muted-foreground mb-1">Cost</p>
                <p className="text-xl font-semibold text-foreground leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{costDisplay}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">Spend</p>
                <p className="text-xl font-semibold text-foreground leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>${totalSpend.toLocaleString('en-US')}</p>
              </div>
            </div>

            <dl>
              <div className={detailRow}>
                <dt className={dt}>Status</dt>
                <dd className="max-w-36">
                  {isEditable ? (
                    <OrderStatusSelect orderId={order.id} initialStatus={order.status as 'active' | 'paused'} />
                  ) : (
                    <span className={cn(badgeShape, 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800')}>completed</span>
                  )}
                </dd>
              </div>
              {isAdmin && (
                <div className={detailRow}>
                  <dt className={dt}>For</dt>
                  <dd className={dd}>{accountName ?? '—'}</dd>
                </div>
              )}
              {isAdmin && (
                <div className={detailRow}>
                  <dt className={dt}>Placed by</dt>
                  <dd className={dd}>{placedByName ?? '—'}</dd>
                </div>
              )}
              <div className={detailRow}>
                <dt className={dt}>Vendor</dt>
                <dd className={dd}>{vendor?.name ?? '—'}</dd>
              </div>
              <div className={detailRow}>
                <dt className={dt}>Daily Budget</dt>
                <dd className={dd}>{order.daily_budget ? `$${order.daily_budget.toLocaleString('en-US')}` : '—'}</dd>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-border gap-3">
                <dt className={`${dt} shrink-0`}>Lead Type</dt>
                <dd className="flex gap-1.5 flex-wrap justify-end">
                  {order.lead_types.length > 0 ? order.lead_types.map(leadType => (
                    <span key={leadType} className="text-xs font-medium px-2 py-1 rounded bg-foreground text-background">{leadType}</span>
                  )) : (
                    <span className={dd}>{order.lead_type ?? '—'}</span>
                  )}
                </dd>
              </div>
              <div className="px-4 py-3 border-b border-border space-y-2">
                <dt className={dt}>States</dt>
                <dd>
                  {order.states.length === 0 ? (
                    <span className={dd}>—</span>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {order.states.map(state => (
                        <span key={state} className="text-xs font-medium px-2 py-1 rounded bg-foreground text-background">{STATE_NAMES[state] ?? state}</span>
                      ))}
                    </div>
                  )}
                </dd>
              </div>
              <div className="px-4 py-3 border-b border-border space-y-2">
                <dt className={dt}>Availability</dt>
                <dd className="flex gap-1">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
                    const active = order.availability.includes(day)
                    return (
                      <span
                        key={day}
                        className={`text-xs font-medium flex-1 text-center py-1.5 rounded ${active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
                      >
                        {day}
                      </span>
                    )
                  })}
                </dd>
              </div>
              <div className="px-4 py-3 space-y-2">
                <dt className={dt}>Agents</dt>
                <dd>
                  {agents.length === 0 ? (
                    <span className="text-xs text-muted-foreground/50">None assigned</span>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {agents.map(agent => {
                        const name = [agent.profile.first_name, agent.profile.last_name].filter(Boolean).join(' ') || '—'
                        return (
                          <div key={agent.user_id} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold flex-shrink-0">
                              {(agent.profile.first_name?.[0] ?? '?').toUpperCase()}
                            </div>
                            <span className="text-xs text-foreground">{name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="col-span-2 flex flex-col bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border shrink-0">
              <p className="text-xs font-semibold text-foreground">Leads ({leads.length})</p>
            </div>
            <div className="px-3 py-2.5 border-b border-border shrink-0">
              <OrderLeadsFilterTabs orderId={id} filter={filter} counts={counts} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border sticky top-0 bg-card z-10">
                    <th className={colHeader}>Lead</th>
                    <th className={colHeader}>Status</th>
                    <th className={colHeader}>Phone</th>
                    <th className={colHeader}>State</th>
                    <th className={colHeader}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground">No leads associated with this order yet.</td>
                    </tr>
                  )}
                  {filteredLeads.map(lead => {
                    const config = leadStatusConfig[lead.status]
                    return (
                      <tr key={lead.id} className="border-b border-border hover:bg-muted transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/leads/${lead.id}`} className="text-xs text-foreground hover:text-muted-foreground transition-colors">
                            {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn(badgeShape, 'gap-1.5 border', config.className)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)} />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatPhone(lead.phone)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{lead.state ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(lead.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
