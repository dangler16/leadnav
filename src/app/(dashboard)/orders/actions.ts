'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

const VALID_DAYS = new Set(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const VALID_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
])

type ServiceClient = ReturnType<typeof createServiceClient>
type CallerRole = 'super_admin' | 'team_admin' | 'user'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error('Unauthorized')
  return {
    supabase,
    service: createServiceClient(),
    callerId: user.id,
    role: profile.role as CallerRole,
  }
}

async function managedTeamIds(service: ServiceClient, callerId: string): Promise<string[]> {
  const { data } = await service
    .from('team_admin_assignments')
    .select('team_id')
    .eq('user_id', callerId)
  return (data ?? []).map(assignment => assignment.team_id)
}

async function canManageUser(
  service: ServiceClient,
  callerId: string,
  role: CallerRole,
  targetUserId: string,
): Promise<boolean> {
  if (role === 'super_admin' || targetUserId === callerId) return true
  if (role !== 'team_admin') return false

  const teamIds = await managedTeamIds(service, callerId)
  if (teamIds.length === 0) return false

  const { data: membership } = await service
    .from('team_members')
    .select('user_id')
    .eq('user_id', targetUserId)
    .in('team_id', teamIds)
    .maybeSingle()

  return Boolean(membership)
}

async function requireOrderAccess(orderId: string) {
  const context = await getContext()
  const { data: order } = await context.service
    .from('orders')
    .select('id, account_id')
    .eq('id', orderId)
    .single()

  if (!order?.account_id) throw new Error('Order not found')
  if (!await canManageUser(context.service, context.callerId, context.role, order.account_id)) {
    throw new Error('Unauthorized')
  }

  return { ...context, order }
}

export async function placeOrder(
  targetUserId: string,
  orderData: {
    vendorId: string | null
    leadType: string
    dailyBudget: number | null
    states: string[]
    availability: string[]
  }
) {
  const { service, callerId, role } = await getContext()

  if (!await canManageUser(service, callerId, role, targetUserId)) throw new Error('Unauthorized')

  if (role === 'user') {
    const { data: membership } = await service
      .from('team_members')
      .select('can_order')
      .eq('user_id', callerId)
      .maybeSingle()
    if (membership && !membership.can_order) throw new Error('You do not have permission to place orders')
  }

  if (!orderData.vendorId) throw new Error('Vendor is required')
  if (!orderData.leadType.trim()) throw new Error('Lead type is required')
  if (!Number.isFinite(orderData.dailyBudget) || (orderData.dailyBudget ?? 0) <= 0) {
    throw new Error('Daily budget must be greater than zero')
  }
  if (orderData.states.length === 0 || orderData.states.some(state => !VALID_STATES.has(state))) {
    throw new Error('Select at least one valid state')
  }
  if (orderData.availability.length === 0 || orderData.availability.some(day => !VALID_DAYS.has(day))) {
    throw new Error('Select at least one valid availability day')
  }

  const { data: vendor } = await service
    .from('vendors')
    .select('lead_types, locations, is_active')
    .eq('id', orderData.vendorId)
    .single()

  if (!vendor?.is_active) throw new Error('Vendor is inactive or unavailable')
  if (vendor.lead_types.length > 0 && !vendor.lead_types.includes(orderData.leadType)) {
    throw new Error('Vendor does not support this lead type')
  }
  if (vendor.locations.length > 0 && orderData.states.some(state => !vendor.locations.includes(state))) {
    throw new Error('One or more selected states are outside the vendor coverage area')
  }

  const { error } = await service.from('orders').insert({
    account_id: targetUserId,
    placed_by: callerId,
    vendor_id: orderData.vendorId,
    lead_type: orderData.leadType,
    lead_types: [orderData.leadType],
    daily_budget: orderData.dailyBudget,
    states: [...new Set(orderData.states)],
    availability: [...new Set(orderData.availability)],
    status: 'active',
  })

  if (error) throw new Error('Failed to place order')
  revalidatePath('/orders')
}

export async function addOrderAgent(orderId: string, userId: string) {
  const { service, callerId, role } = await requireOrderAccess(orderId)
  if (role === 'user' || !await canManageUser(service, callerId, role, userId)) throw new Error('Unauthorized')

  const { error } = await service.from('order_agents').upsert({ order_id: orderId, user_id: userId })
  if (error) throw new Error('Failed to add agent')
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}

export async function removeOrderAgent(orderId: string, userId: string) {
  const { service, callerId, role } = await requireOrderAccess(orderId)
  if (role === 'user' || !await canManageUser(service, callerId, role, userId)) throw new Error('Unauthorized')

  const { error } = await service.from('order_agents').delete().eq('order_id', orderId).eq('user_id', userId)
  if (error) throw new Error('Failed to remove agent')
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}

export async function archiveOrder(orderId: string, currentStatus: string) {
  const { supabase } = await getContext()
  const update: Record<string, unknown> = { archived: true }
  if (currentStatus === 'active') update.status = 'completed'

  const { error } = await supabase.from('orders').update(update).eq('id', orderId)
  if (error) throw new Error('Failed to archive order')
  revalidatePath('/orders')
}

export async function unarchiveOrder(orderId: string) {
  const { supabase } = await getContext()
  const { error } = await supabase.from('orders').update({ archived: false }).eq('id', orderId)
  if (error) throw new Error('Failed to unarchive order')
  revalidatePath('/orders')
}

export async function transferOrder(orderId: string, newAccountId: string) {
  const { service, callerId, role } = await requireOrderAccess(orderId)
  if (role === 'user' || !await canManageUser(service, callerId, role, newAccountId)) {
    throw new Error('Unauthorized')
  }

  const { error } = await service.from('orders').update({ account_id: newAccountId }).eq('id', orderId)
  if (error) throw new Error('Failed to transfer order')
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}
