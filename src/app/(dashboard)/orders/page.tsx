import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Order, Vendor } from '@/lib/types'
import { NewOrderDialog } from './new-order-dialog'
import { OrderStatusSelect } from './order-status-select'
import { badgeShape } from '@/components/ui/badge'
import { OrdersFilterTabs } from './orders-filter-tabs'
import { SortableHeader, SortDir } from '@/components/sortable-header'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type StatusFilter = 'all' | Order['status']

function sortOrders(data: (Order & { _vendor: Vendor | null })[], col: string | null, dir: SortDir | null): (Order & { _vendor: Vendor | null })[] {
  if (!col || !dir) return data
  return [...data].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'id') { av = a.id; bv = b.id }
    else if (col === 'vendor') { av = a._vendor?.name ?? null; bv = b._vendor?.name ?? null }
    else if (col === 'lead_type') { av = a.lead_types.join(', ') || a.lead_type; bv = b.lead_types.join(', ') || b.lead_type }
    else if (col === 'daily_budget') { av = a.daily_budget ?? null; bv = b.daily_budget ?? null }
    else if (col === 'cost_per_lead') { av = a._vendor?.cost_per_lead ?? null; bv = b._vendor?.cost_per_lead ?? null }
    else if (col === 'status') { av = a.status; bv = b.status }
    else { av = a.created_at; bv = b.created_at }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av
    const cmp = String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; sortDir?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter as StatusFilter) ?? 'all'
  const sort = params.sort ?? null
  const sortDir = (params.sortDir as SortDir | undefined) ?? null

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

  const ordersWithVendor = orders.map(o => ({ ...o, _vendor: o.vendor_id ? (vendorMap[o.vendor_id] ?? null) : null }))

  const counts: Record<StatusFilter, number> = {
    all:       orders.length,
    active:    orders.filter(o => o.status === 'active').length,
    paused:    orders.filter(o => o.status === 'paused').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }

  const filtered = sortOrders(
    filter === 'all' ? ordersWithVendor : ordersWithVendor.filter(o => o.status === filter),
    sort, sortDir,
  )

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">
      <div className="flex items-start justify-between w-full pb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your lead orders.</p>
        </div>
        <NewOrderDialog vendors={vendors} userId={user.id} />
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border/50">
          <OrdersFilterTabs filter={filter} counts={counts} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-2"><SortableHeader column="id" label="Order #" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="vendor" label="Vendor" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="lead_type" label="Lead Type" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="daily_budget" label="Daily Budget" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="cost_per_lead" label="Cost/Lead" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="status" label="Status" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="date" label="Date" currentSort={sort} currentDir={sortDir} /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">No orders yet. Place your first order to get started.</td>
                </tr>
              )}
              {filtered.map(order => {
                const isEditable = order.status === 'active' || order.status === 'paused'
                return (
                  <tr key={order.id} className="hover:bg-muted transition-colors">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/orders/${order.id}`} className="text-muted-foreground hover:text-red-600 transition-colors">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-sm text-foreground">{order._vendor?.name ?? '—'}</td>
                    <td className="px-3 py-2 text-foreground">
                      {order.lead_types.length > 0
                        ? order.lead_types.join(', ')
                        : (order.lead_type ?? '—')}
                    </td>
                    <td className="px-3 py-2 text-foreground">{order.daily_budget ? `$${order.daily_budget}` : '—'}</td>
                    <td className="px-3 py-2 text-foreground">{order._vendor?.cost_per_lead ? `$${order._vendor.cost_per_lead}` : '—'}</td>
                    <td className="px-3 py-2">
                      {isEditable ? (
                        <OrderStatusSelect orderId={order.id} initialStatus={order.status as 'active' | 'paused'} />
                      ) : (
                        <span className={`${badgeShape} bg-blue-100 text-blue-500 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800`}>
                          Completed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(order.created_at)}</td>
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
