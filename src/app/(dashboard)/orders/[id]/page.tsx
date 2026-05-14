import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Order, Vendor, Lead, LeadStatus } from '@/lib/types'
import { OrderStatusSelect } from '../order-status-select'
import { OrderLeadsFilterTabs } from './order-leads-filter-tabs'
import { EditOrderDialog } from './edit-order-dialog'
import { ChevronLeft } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'

const leadStatusConfig: Record<LeadStatus, { label: string; dotColor: string; bg: string; color: string; borderColor: string }> = {
  new:               { label: 'New',           dotColor: '#3b82f6', bg: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' },
  not_contacted:     { label: 'Not Contacted', dotColor: '#9ca3af', bg: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' },
  contacted:         { label: 'Contacted',     dotColor: '#06b6d4', bg: '#cffafe', color: '#0e7490', borderColor: '#a5f3fc' },
  appt_set:          { label: 'Appt Set',      dotColor: '#6366f1', bg: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' },
  appt_no_show:      { label: 'No Show',       dotColor: '#eab308', bg: '#fef9c3', color: '#a16207', borderColor: '#fef08a' },
  appt_no_sale:      { label: 'No Sale',       dotColor: '#f97316', bg: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' },
  appt_rescheduled:  { label: 'Rescheduled',   dotColor: '#a855f7', bg: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' },
  sale:              { label: 'Sale',          dotColor: '#22c55e', bg: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' },
  lost:              { label: 'Lost',          dotColor: '#ef4444', bg: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' },
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
        <Link href="/orders" className="flex items-center gap-0 text-sm text-gray-500 hover:text-gray-700 mb-1 -mt-1 -ml-1">
          <ChevronLeft size={15} /> Back to Orders
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono">
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Placed {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="bg-white rounded-lg border border-gray-200 col-span-1 overflow-auto flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex items-center justify-between">
            <p className="font-semibold text-base text-gray-800">Order Details</p>
            {isEditable && <EditOrderDialog order={order} vendor={vendor} />}
          </div>

          <div className="grid grid-cols-3 border-b border-gray-100 shrink-0">
            <div className="px-4 py-3 border-r border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
            </div>
            <div className="px-4 py-3 border-r border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Lead Cost</p>
              <p className="text-2xl font-bold text-gray-900">${leadCost.toLocaleString('en-US')}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">Total Spend</p>
              <p className="text-2xl font-bold text-gray-900">${totalSpend.toLocaleString('en-US')}</p>
            </div>
          </div>

          <dl className="divide-y divide-gray-100">
            <div className="flex justify-between items-center px-4 py-3">
              <dt className="text-sm text-gray-400">Status</dt>
              <dd className="max-w-36">
                {isEditable ? (
                  <OrderStatusSelect orderId={order.id} initialStatus={order.status as 'active' | 'paused'} />
                ) : (
                  <span className={`${badgeShape} bg-gray-100 text-gray-600`}>
                    Completed
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <dt className="text-sm text-gray-400">Vendor</dt>
              <dd className="text-sm font-medium text-gray-800">{vendor?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between items-center px-4 py-3">
              <dt className="text-sm text-gray-400">Daily Budget</dt>
              <dd className="text-sm font-medium text-gray-800">{order.daily_budget ? `$${order.daily_budget.toLocaleString('en-US')}` : '—'}</dd>
            </div>
            <div className="flex justify-between items-center px-4 py-3 gap-3">
              <dt className="text-sm text-gray-400 shrink-0">Lead Type</dt>
              <dd className="flex gap-1.5 flex-wrap justify-end">
                {order.lead_types.length > 0 ? order.lead_types.map(lt => (
                  <span key={lt} className="text-sm font-medium px-2 py-1 rounded-sm bg-red-600 text-white">{lt}</span>
                )) : (
                  <span className="text-sm font-medium text-gray-800">{order.lead_type ?? '—'}</span>
                )}
              </dd>
            </div>
            <div className="px-4 py-3 space-y-2">
              <dt className="text-sm text-gray-400">States</dt>
              <dd>
                {order.states.length === 0 ? (
                  <span className="text-sm text-gray-800">—</span>
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
              <dt className="text-sm text-gray-400">Availability</dt>
              <dd className="flex gap-1.5">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => {
                  const active = order.availability.includes(d)
                  return (
                    <span
                      key={d}
                      className={`text-sm font-medium flex-1 text-center py-1.5 rounded-sm ${active ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {d}
                    </span>
                  )
                })}
              </dd>
            </div>
          </dl>
        </div>

        <div className="col-span-2 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <p className="font-semibold text-base text-gray-800">Leads ({leads.length})</p>
          </div>
          <div className="p-3 border-b border-gray-100 shrink-0">
            <OrderLeadsFilterTabs orderId={id} filter={filter} counts={counts} />
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-100">
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Lead</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Status</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Phone</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">State</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-gray-400">No leads associated with this order yet.</td>
                  </tr>
                )}
                {filteredLeads.map(lead => {
                  const statusCfg = leadStatusConfig[lead.status]
                  return (
                    <tr key={lead.id} className="hover:bg-neutral-100 transition-colors">
                      <td className="px-3 py-2">
                        <Link href={`/leads/${lead.id}`} className="text-sm text-gray-900 hover:text-red-600 transition-colors">
                          {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`${badgeShape} gap-1.5 border`}
                          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.borderColor }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: statusCfg.dotColor }} />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600">{formatPhone(lead.phone)}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{lead.state ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">{formatDateTime(lead.created_at)}</td>
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
