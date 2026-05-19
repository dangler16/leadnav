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
  new:              { label: 'new',           className: 'bg-blue-100 text-blue-700 border-blue-200',       dotClass: 'bg-blue-500' },
  not_contacted:    { label: 'not contacted', className: 'bg-gray-100 text-gray-600 border-gray-200',       dotClass: 'bg-gray-400' },
  contacted:        { label: 'contacted',     className: 'bg-cyan-100 text-cyan-700 border-cyan-200',       dotClass: 'bg-cyan-500' },
  appt_set:         { label: 'appt set',      className: 'bg-indigo-100 text-indigo-700 border-indigo-200', dotClass: 'bg-indigo-500' },
  appt_no_show:     { label: 'no show',       className: 'bg-yellow-100 text-yellow-700 border-yellow-200', dotClass: 'bg-yellow-500' },
  appt_no_sale:     { label: 'no sale',       className: 'bg-orange-100 text-orange-700 border-orange-200', dotClass: 'bg-orange-500' },
  appt_rescheduled: { label: 'rescheduled',   className: 'bg-purple-100 text-purple-700 border-purple-200', dotClass: 'bg-purple-500' },
  sale:             { label: 'sale',          className: 'bg-green-100 text-green-700 border-green-200',    dotClass: 'bg-green-500' },
  lost:             { label: 'lost',          className: 'bg-red-100 text-red-700 border-red-200',          dotClass: 'bg-red-500' },
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

  const colHeader = 'text-left text-xs font-medium uppercase tracking-wide text-gray-500 px-3 py-2.5'
  const detailRow = 'flex justify-between items-center px-4 py-3 border-b border-gray-200'
  const dt = 'text-xs text-gray-500'
  const dd = 'text-xs font-medium text-gray-900'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Header */}
      <div className="px-8 pt-5 pb-4 shrink-0 border-b border-gray-100">
        <Link href="/orders" className="flex items-center gap-0.5 text-xs text-gray-500 hover:text-gray-900 transition-colors mb-2">
          <ChevronLeft size={13} /> Back to Orders
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-xs text-gray-400 mt-1.5">Placed {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden px-8 py-5">
        <div className="grid grid-cols-3 gap-4 h-full">

          {/* Order details sidebar */}
          <div className="bg-white border border-gray-200 rounded-lg col-span-1 overflow-auto flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-900">Order Details</p>
              <EditOrderDialog order={order} />
            </div>

            <div className="grid grid-cols-3 border-b border-gray-100 shrink-0">
              <div className="px-4 py-3 border-r border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Leads</p>
                <p className="text-xl font-semibold text-gray-900 leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{leads.length}</p>
              </div>
              <div className="px-4 py-3 border-r border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Cost</p>
                <p className="text-xl font-semibold text-gray-900 leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>${leadCost.toLocaleString('en-US')}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Spend</p>
                <p className="text-xl font-semibold text-gray-900 leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>${totalSpend.toLocaleString('en-US')}</p>
              </div>
            </div>

            <dl>
              <div className={detailRow}>
                <dt className={dt}>Status</dt>
                <dd className="max-w-36">
                  {isEditable ? (
                    <OrderStatusSelect orderId={order.id} initialStatus={order.status as 'active' | 'paused'} />
                  ) : (
                    <span className={cn(badgeShape, 'bg-blue-100 text-blue-700 border border-blue-200')}>completed</span>
                  )}
                </dd>
              </div>
              <div className={detailRow}>
                <dt className={dt}>Vendor</dt>
                <dd className={dd}>{vendor?.name ?? '—'}</dd>
              </div>
              <div className={detailRow}>
                <dt className={dt}>Daily Budget</dt>
                <dd className={dd}>{order.daily_budget ? `$${order.daily_budget.toLocaleString('en-US')}` : '—'}</dd>
              </div>
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 gap-3">
                <dt className={`${dt} shrink-0`}>Lead Type</dt>
                <dd className="flex gap-1.5 flex-wrap justify-end">
                  {order.lead_types.length > 0 ? order.lead_types.map(lt => (
                    <span key={lt} className="text-xs font-medium px-2 py-1 rounded bg-gray-900 text-white">{lt}</span>
                  )) : (
                    <span className={dd}>{order.lead_type ?? '—'}</span>
                  )}
                </dd>
              </div>
              <div className="px-4 py-3 border-b border-gray-100 space-y-2">
                <dt className={dt}>States</dt>
                <dd>
                  {order.states.length === 0 ? (
                    <span className={dd}>—</span>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {order.states.map(s => (
                        <span key={s} className="text-xs font-medium px-2 py-1 rounded bg-gray-900 text-white">{STATE_NAMES[s] ?? s}</span>
                      ))}
                    </div>
                  )}
                </dd>
              </div>
              <div className="px-4 py-3 space-y-2">
                <dt className={dt}>Availability</dt>
                <dd className="flex gap-1">
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                    const active = order.availability.includes(d)
                    return (
                      <span
                        key={d}
                        className={`text-xs font-medium flex-1 text-center py-1.5 rounded ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {d}
                      </span>
                    )
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Leads table */}
          <div className="col-span-2 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 shrink-0">
              <p className="text-xs font-semibold text-gray-900">Leads ({leads.length})</p>
            </div>
            <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
              <OrderLeadsFilterTabs orderId={id} filter={filter} counts={counts} />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 sticky top-0 bg-white z-10">
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
                      <td colSpan={5} className="py-12 text-center text-xs text-gray-400">No leads associated with this order yet.</td>
                    </tr>
                  )}
                  {filteredLeads.map(lead => {
                    const cfg = leadStatusConfig[lead.status]
                    return (
                      <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <Link href={`/leads/${lead.id}`} className="text-xs text-gray-900 hover:text-gray-500 transition-colors">
                            {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn(badgeShape, 'gap-1.5 border', cfg.className)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass)} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{formatPhone(lead.phone)}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{lead.state ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(lead.created_at)}</td>
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
