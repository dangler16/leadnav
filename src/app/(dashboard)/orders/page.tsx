import { createClient } from '@/lib/supabase/server'
import { Order, Vendor } from '@/lib/types'
import { Package } from 'lucide-react'
import { NewOrderDialog } from './new-order-dialog'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const statusColors: Record<Order['status'], string> = {
  placed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
}

const statusLabels: Record<Order['status'], string> = {
  placed: 'Placed',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
}

export default async function OrdersPage() {
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

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your lead orders.</p>
        </div>
        <NewOrderDialog vendors={vendors} userId={user.id} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
            <Package size={18} />
          </div>
          <p className="font-semibold text-base text-gray-800">All Orders</p>
          <span className="text-xs text-gray-400 ml-1">({orders.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Order ID</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Vendor</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Lead Type</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Daily Budget</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Cost/Lead</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Status</th>
                <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">No orders yet. Place your first order to get started.</td>
                </tr>
              )}
              {orders.map(order => {
                const vendor = order.vendor_id ? vendorMap[order.vendor_id] : null
                return (
                  <tr key={order.id} className="hover:bg-neutral-100 transition-colors">
                    <td className="px-3 py-2 font-mono text-xs text-gray-600">#{order.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-3 py-2 text-gray-700">{vendor?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{order.lead_type ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{order.daily_budget ? `$${order.daily_budget}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{vendor?.cost_per_lead ? `$${vendor.cost_per_lead}` : '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-[3px] px-2 py-[6px] text-xs font-medium leading-none ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400">{formatDate(order.created_at)}</td>
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
