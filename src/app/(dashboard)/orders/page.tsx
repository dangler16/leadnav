import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Order, Vendor } from '@/lib/types'
import { NewOrderDialog } from './new-order-dialog'
import { OrderStatusSelect } from './order-status-select'
import { badgeShape } from '@/components/ui/badge'
import { OrdersFilterTabs } from './orders-filter-tabs'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type StatusFilter = 'all' | Order['status']

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter as StatusFilter) ?? 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: ordersData }, { data: vendorsData }] = await Promise.all([
    supabase.from('orders').select('*').eq('account_id', user.id).order('created_at', { ascending: false }),
    supabase.from('vendors').select('*').order('name'),
  ])

  const orders = (ordersData ?? []) as Order[]
  const vendors = (vendorsData ?? []) as Vendor[]
  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]))

  const counts: Record<StatusFilter, number> = {
    all:       orders.length,
    active:    orders.filter(o => o.status === 'active').length,
    paused:    orders.filter(o => o.status === 'paused').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">
      <div className="flex items-start justify-between w-full pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your lead orders.</p>
        </div>
        <NewOrderDialog vendors={vendors} userId={user.id} />
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <OrdersFilterTabs filter={filter} counts={counts} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Order #</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Vendor</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Lead Type</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Daily Budget</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Cost/Lead</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Status</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">No orders yet. Place your first order to get started.</td>
                </tr>
              )}
              {filtered.map(order => {
                const vendor = order.vendor_id ? vendorMap[order.vendor_id] : null
                const isEditable = order.status === 'active' || order.status === 'paused'
                return (
                  <tr key={order.id} className="hover:bg-neutral-100 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/orders/${order.id}`} className="text-gray-400 hover:text-red-600 transition-colors">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">{vendor?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {order.lead_types.length > 0
                        ? order.lead_types.join(', ')
                        : (order.lead_type ?? '—')}
                    </td>
                    <td className="px-3 py-2 text-gray-900">{order.daily_budget ? `$${order.daily_budget}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-900">{vendor?.cost_per_lead ? `$${vendor.cost_per_lead}` : '—'}</td>
                    <td className="px-3 py-2">
                      {isEditable ? (
                        <OrderStatusSelect orderId={order.id} initialStatus={order.status as 'active' | 'paused'} />
                      ) : (
                        <span className={`${badgeShape} bg-blue-100 text-blue-500 border border-blue-200`}>
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-400">{formatDate(order.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
