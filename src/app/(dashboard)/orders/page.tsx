import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Order, Profile, UserRole, Vendor } from '@/lib/types'
import { NewOrderDialog } from './new-order-dialog'
import { OrderStatusSelect } from './order-status-select'
import { EditOrderDialog } from './[id]/edit-order-dialog'
import { badgeShape } from '@/components/ui/badge'
import { OrdersFilterTabs, StatusFilter } from './orders-filter-tabs'
import { ArchiveOrderButton } from './archive-order-button'
import { SortableHeader, SortDir } from '@/components/sortable-header'
import { cn } from '@/lib/utils'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function orderLeadTypes(order: Order): string[] {
  return order.lead_types.length > 0 ? order.lead_types : (order.lead_type ? [order.lead_type] : [])
}


function sortOrders(data: (Order & { _vendor: Vendor | null })[], col: string | null, dir: SortDir | null): (Order & { _vendor: Vendor | null })[] {
  if (!col || !dir) return data
  return [...data].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'id') { av = a.id; bv = b.id }
    else if (col === 'vendor') { av = a._vendor?.name ?? null; bv = b._vendor?.name ?? null }
    else if (col === 'lead_type') { av = a.lead_types.join(', ') || a.lead_type; bv = b.lead_types.join(', ') || b.lead_type }
    else if (col === 'daily_budget') { av = a.daily_budget ?? null; bv = b.daily_budget ?? null }
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

  const [{ data: myProfileData }, { data: vendorsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('vendors').select('*').order('name'),
  ])

  const myProfile = myProfileData as Profile | null
  const role = (myProfile?.role ?? 'user') as UserRole
  const isSuperAdmin = role === 'super_admin'
  const isTeamAdmin = role === 'team_admin'
  const isAdmin = isSuperAdmin || isTeamAdmin

  const vendors = (vendorsData ?? []) as Vendor[]
  const service = createServiceClient()

  // Fetch users this caller can place orders on behalf of, and determine which orders to show
  let orderableProfiles: Profile[] = []
  let memberIds: string[] = []

  if (isSuperAdmin) {
    const { data } = await service.from('profiles').select('*').neq('id', user.id).order('first_name')
    orderableProfiles = (data ?? []) as Profile[]
  } else if (isTeamAdmin) {
    const { data: assignments } = await supabase
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', user.id)
    const teamIds = (assignments ?? []).map((a: { team_id: string }) => a.team_id)
    if (teamIds.length > 0) {
      const { data: membersData } = await service
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds)
      memberIds = (membersData ?? []).map((m: { user_id: string }) => m.user_id)
      if (memberIds.length > 0) {
        const { data } = await service
          .from('profiles')
          .select('*')
          .in('id', memberIds)
          .order('first_name')
        orderableProfiles = (data ?? []) as Profile[]
      }
    }
  }

  // Build a profile lookup for the "For" column
  const profileById: Record<string, Profile> = {}
  if (myProfile) profileById[user.id] = myProfile
  for (const p of orderableProfiles) profileById[p.id] = p

  // Fetch orders with role-appropriate scope
  let ordersQuery = service.from('orders').select('*').order('created_at', { ascending: false })
  if (isSuperAdmin) {
    // no filter — see all orders
  } else if (isTeamAdmin) {
    const accountIds = [user.id, ...memberIds]
    ordersQuery = ordersQuery.in('account_id', accountIds)
  } else {
    ordersQuery = ordersQuery.eq('account_id', user.id)
  }
  const { data: ordersData } = await ordersQuery

  const orders = (ordersData ?? []) as Order[]
  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v]))
  const ordersWithVendor = orders.map(o => ({ ...o, _vendor: o.vendor_id ? (vendorMap[o.vendor_id] ?? null) : null }))

  const nonArchived = orders.filter(o => !o.archived)
  const counts: Record<StatusFilter, number> = {
    all:       nonArchived.length,
    active:    nonArchived.filter(o => o.status === 'active').length,
    paused:    nonArchived.filter(o => o.status === 'paused').length,
    completed: nonArchived.filter(o => o.status === 'completed').length,
    archived:  orders.filter(o => o.archived).length,
  }

  const filtered = sortOrders(
    filter === 'archived'
      ? ordersWithVendor.filter(o => o.archived)
      : filter === 'all'
        ? ordersWithVendor.filter(o => !o.archived)
        : ordersWithVendor.filter(o => !o.archived && o.status === filter),
    sort, sortDir,
  )

  // Fetch any placed_by profiles not already in profileById
  const missingPlacedByIds = [...new Set(
    orders.map(o => o.placed_by).filter((id): id is string => !!id && !(id in profileById))
  )]
  if (missingPlacedByIds.length > 0) {
    const { data } = await service.from('profiles').select('*').in('id', missingPlacedByIds)
    for (const p of (data ?? []) as Profile[]) profileById[p.id] = p
  }

  // Show admin columns when admin can see multiple users' orders
  const showForColumn = isAdmin && orderableProfiles.length > 0
  const colSpan = 7 + (showForColumn ? 2 : 0)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-foreground">Orders</h1>
        <NewOrderDialog vendors={vendors} userId={user.id} orderableProfiles={orderableProfiles} />
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <OrdersFilterTabs filter={filter} counts={counts} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2.5"><SortableHeader column="id"           label="Order #"       currentSort={sort} currentDir={sortDir} /></th>
                {showForColumn && <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Agent</th>}
                {showForColumn && <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Placed by</th>}
                <th className="text-left px-3 py-2.5"><SortableHeader column="vendor"        label="Vendor"        currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="lead_type"     label="Lead Type"     currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="daily_budget"  label="Daily Budget"  currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="status"        label="Status"        currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="date"          label="Date"          currentSort={sort} currentDir={sortDir} /></th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colSpan} className="py-12 text-center text-xs text-muted-foreground">No orders yet. Place your first order to get started.</td>
                </tr>
              )}
              {filtered.map(order => {
                const isEditable = order.status === 'active' || order.status === 'paused'
                const accountProfile = order.account_id ? profileById[order.account_id] : null
                const accountName = accountProfile
                  ? [accountProfile.first_name, accountProfile.last_name].filter(Boolean).join(' ')
                  : null
                const placedByProfile = order.placed_by ? profileById[order.placed_by] : null
                const placedByName = placedByProfile
                  ? [placedByProfile.first_name, placedByProfile.last_name].filter(Boolean).join(' ')
                  : null
                return (
                  <tr key={order.id} className="border-b border-border hover:bg-muted transition-colors">
                    <td className="px-3 py-2.5">
                      <Link href={`/orders/${order.id}`} className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    {showForColumn && (
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {accountName ?? <span className="text-border font-mono text-[10px]">{order.account_id?.slice(0, 8)}</span>}
                      </td>
                    )}
                    {showForColumn && (
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {placedByName ?? (order.placed_by ? <span className="text-border font-mono text-[10px]">{order.placed_by.slice(0, 8)}</span> : <span className="text-border">—</span>)}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-xs text-foreground">{order._vendor?.name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {(() => {
                        const types = orderLeadTypes(order)
                        if (types.length === 0) return <span className="text-muted-foreground">—</span>
                        return (
                          <div className="flex gap-1 flex-wrap">
                            {types.map(lt => {
                              const cost = order._vendor
                                ? (order._vendor.lead_type_costs[lt] ?? order._vendor.cost_per_lead)
                                : null
                              return (
                                <span key={lt} className={cn(badgeShape, 'bg-muted text-muted-foreground border border-border')}>
                                  {cost != null ? `${lt} $${cost.toLocaleString('en-US')}` : lt}
                                </span>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-foreground">{order.daily_budget ? `$${order.daily_budget}` : '—'}</td>
                    <td className="px-3 py-2.5">
                      {isEditable ? (
                        <OrderStatusSelect orderId={order.id} initialStatus={order.status as 'active' | 'paused'} />
                      ) : (
                        <span className={cn(badgeShape, 'bg-blue-100 text-blue-700 border border-blue-200')}>
                          completed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(order.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {isEditable && !order.archived && <EditOrderDialog order={order} orderableProfiles={orderableProfiles} />}
                        <ArchiveOrderButton orderId={order.id} archived={order.archived} status={order.status} />
                      </div>
                    </td>
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
