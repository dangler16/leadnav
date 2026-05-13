import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Order, Vendor, Lead } from '@/lib/types'
import { OrderStatusSelect } from '../order-status-select'
import { ChevronLeft } from 'lucide-react'

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

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
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

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 col-span-1">
          <p className="font-semibold text-base text-gray-800 mb-4">Order Details</p>
          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-400">Status</dt>
              <dd className="max-w-36">
                {isEditable ? (
                  <OrderStatusSelect orderId={order.id} initialStatus={order.status} />
                ) : (
                  <span className="inline-flex items-center rounded-[3px] px-2 py-[6px] text-xs font-medium leading-none bg-gray-100 text-gray-600">
                    Completed
                  </span>
                )}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-400">Vendor</dt>
              <dd className="text-sm text-gray-800">{vendor?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-400">Lead Type</dt>
              <dd className="text-sm text-gray-800">{order.lead_type ?? '—'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-400">Daily Budget</dt>
              <dd className="text-sm text-gray-800">{order.daily_budget ? `$${order.daily_budget}` : '—'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-400">Cost / Lead</dt>
              <dd className="text-sm text-gray-800">{vendor?.cost_per_lead != null ? `$${vendor.cost_per_lead}` : '—'}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-gray-400">Created</dt>
              <dd className="text-sm text-gray-400">{formatDate(order.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-base text-gray-800">Leads ({leads.length})</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Lead</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Status</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Phone</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">State</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-gray-400">No leads associated with this order yet.</td>
                </tr>
              )}
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-neutral-100 transition-colors">
                  <td className="px-3 py-2">
                    <Link href={`/leads/${lead.id}`} className="text-sm text-gray-900 hover:text-red-600 transition-colors">
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{lead.status}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{formatPhone(lead.phone)}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{lead.state ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
