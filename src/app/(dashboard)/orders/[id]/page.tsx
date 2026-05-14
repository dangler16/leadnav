import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Order, Vendor, Lead, LeadStatus } from '@/lib/types'
import { OrderStatusSelect } from '../order-status-select'
import { OrderLeadsFilterTabs } from './order-leads-filter-tabs'
import { EditOrderDialog } from './edit-order-dialog'
import { ChevronLeft } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const leadStatusConfig: Record<LeadStatus, { label: string; className: string; dotClass: string }> = {
  new:              { label: 'New',           className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',       dotClass: 'bg-blue-500' },
  not_contacted:    { label: 'Not Contacted', className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',       dotClass: 'bg-gray-400 dark:bg-gray-500' },
  contacted:        { label: 'Contacted',     className: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',       dotClass: 'bg-cyan-500' },
  appt_set:         { label: 'Appt Set',      className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800', dotClass: 'bg-indigo-500' },
  appt_no_show:     { label: 'No Show',       className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', dotClass: 'bg-yellow-500' },
  appt_no_sale:     { label: 'No Sale',       className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', dotClass: 'bg-orange-500' },
  appt_rescheduled: { label: 'Rescheduled',   className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800', dotClass: 'bg-purple-500' },
  sale:             { label: 'Sale',          className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', dotClass: 'bg-green-500' },
  lost:             { label: 'Lost',          className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',             dotClass: 'bg-red-500' },
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
    month: 'long', day: 'numeric', year: 'numeric',
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

  const [{ data: orderData }, { data: leadsData }] = await Promise.all([
    supabase.from('orders').select('*').eq('id', id).eq('account_id', user.id).single(),
    supabase.from('leads').select('*').eq('order_id', id).order('created_at', { ascending: false }),
  ])

  if (!orderData) notFound()
  const order = orderData as Order
  const leads = (leadsData ?? []) as Lead[]

  let vendor: Vendor | null = null
  if (order.vendor_id) {
    const { data } = await supabase.from('vendors').select('*').eq('id', order.vendor_id).single()
    vendor = data as Vendor | null
  }

  const isEditable = order.status === 'active' || order.status === 'paused'

  const leadCost = vendor?.cost_per_lead ?? 0
  const totalSpend = leadCost * leads.length

  const counts = leadTabs.reduce((acc, tab) => {
    acc[tab.value] = tab.value === 'all' ? leads.length : leads.filter(l => l.status === tab.value).length
    return acc
  }, {} as Record<LeadStatusFilter, number>)

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full overflow-hidden">
      <div>
        <Link href="/orders" className="flex items-center gap-0 text-sm text-muted-foreground hover:text-foreground mb-1 -mt-1 -ml-1">
          <ChevronLeft size={15} /> Back to Orders
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Placed {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="bg-card rounded-lg border border-border col-span-1 overflow-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border/50 shrink-0 flex items-center justify-between">
            <p className="font-semibold text-base text-foreground">Order Details</p>
            {isEditable && <EditOrderDialog order={order} vendor={vendor} />}
          </div>

          <div className="grid grid-cols-3 border-b border-border/50 shrink-0">
            <div className="px-4 py-3 border-r border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Total Leads</p>
              <p className="text-2xl font-bold text-foreground">{leads.length}</p>
            </div>
            <div className="px-4 py-3 border-r border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Lead Cost</p>
              <p className="text-2xl font-bold text-foreground">${leadCost.toLocaleString('en-US')}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">Total Spend</p>
              <p className="text-2xl font-bold text-foreground">${totalSpend.toLocaleString('en-US')}</p>
            </div>
          </div>

          <dl className="divide-y divide-border/50">
            <div className="flex justify-between items-center px-4 py-3">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="max-w-36">
                {isEditable ? (
                  <OrderStatusSelect orderId={order.id} initialStatus={order.status as 'active' | 'paused'} />
                ) : (
                  <span className={`${badgeShape} bg-muted text-muted-foreground`}>
                    Completed
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <dt className="text-sm text-muted-foreground">Vendor</dt>
              <dd className="text-sm font-medium text-foreground">{vendor?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <dt className="text-sm text-muted-foreground">Daily Budget</dt>
              <dd className="text-sm font-medium text-foreground">{order.daily_budget ? `$${order.daily_budget.toLocaleString('en-US')}` : '—'}</dd>
            </div>
            <div className="flex justify-between items-center px-4 py-3 gap-3">
              <dt className="text-sm text-muted-foreground shrink-0">Lead Type</dt>
              <dd className="flex gap-1.5 flex-wrap justify-end">
                {order.lead_types.length > 0 ? order.lead_types.map(lt => (
                  <span key={lt} className="text-sm font-medium px-2 py-1 rounded-sm bg-red-600 text-white">{lt}</span>
                )) : (
                  <span className="text-sm font-medium text-foreground">{order.lead_type ?? '—'}</span>
                )}
              </dd>
            </div>
            <div className="px-4 py-3 space-y-2">
              <dt className="text-sm text-muted-foreground">States</dt>
              <dd>
                {order.states.length === 0 ? (
                  <span className="text-sm text-foreground">—</span>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {order.states.map(s => (
                      <span key={s} className="text-sm font-medium text-center px-2 py-1.5 rounded-sm bg-red-600 text-white">{STATE_NAMES[s] ?? s}</span>
                    ))}
                  </div>
                )}
              </dd>
            </div>
            <div className="px-4 py-3 space-y-2">
              <dt className="text-sm text-muted-foreground">Availability</dt>
              <dd className="flex gap-1.5">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                  const active = order.availability.includes(d)
                  return (
                    <span
                      key={d}
                      className={`text-sm font-medium flex-1 text-center py-1.5 rounded-sm ${active ? 'bg-red-600 text-white' : 'bg-muted text-muted-foreground'}`}
                    >
                      {d}
                    </span>
                  )
                })}
              </dd>
            </div>
          </dl>
        </div>

        <div className="col-span-2 flex flex-col bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 shrink-0">
            <p className="font-semibold text-base text-foreground">Leads ({leads.length})</p>
          </div>
          <div className="p-3 border-b border-border/50 shrink-0">
            <OrderLeadsFilterTabs orderId={id} filter={filter} counts={counts} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Lead</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Status</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Phone</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">State</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No leads associated with this order yet.</td>
                  </tr>
                )}
                {filteredLeads.map(lead => {
                  const cfg = leadStatusConfig[lead.status]
                  return (
                    <tr key={lead.id} className="hover:bg-muted transition-colors">
                      <td className="px-3 py-2">
                        <Link href={`/leads/${lead.id}`} className="text-sm text-foreground hover:text-red-600 transition-colors">
                          {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn(badgeShape, 'gap-1.5 border', cfg.className)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{formatPhone(lead.phone)}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{lead.state ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(lead.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
