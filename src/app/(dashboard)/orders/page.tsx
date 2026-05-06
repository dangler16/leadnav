import { createClient } from '@/lib/supabase/server'
import { Order, Vendor } from '@/lib/types'
import { Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your lead orders.</p>
        </div>
        <NewOrderDialog vendors={vendors} userId={user.id} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            <Package size={15} />
          </div>
          <p className="text-sm font-semibold text-gray-900">All Orders</p>
          <span className="text-xs text-gray-400 ml-1">({orders.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Order ID</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Line of Business</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Lead Type</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Location</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Daily Budget</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Cost/Lead</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-400">No orders found. Place your first order to get started.</td>
                </tr>
              )}
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-3 py-3 text-gray-700">{order.line_of_business ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-700">{order.lead_type ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-700">{order.location ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-700">{order.daily_budget ? `$${order.daily_budget}` : '—'}</td>
                  <td className="px-3 py-3 text-gray-700">{order.cost_per_lead ? `$${order.cost_per_lead}` : '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
