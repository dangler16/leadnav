'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) throw new Error('Unauthorized')

  const service = createServiceClient()

  if (profile.role === 'super_admin') {
    // no restriction
  } else if (profile.role === 'team_admin') {
    if (targetUserId !== user.id) {
      const { data: assignments } = await service
        .from('team_admin_assignments')
        .select('team_id')
        .eq('user_id', user.id)
      const teamIds = (assignments ?? []).map((a: { team_id: string }) => a.team_id)
      const { data: members } = await service
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
      const memberIds = new Set((members ?? []).map((m: { user_id: string }) => m.user_id))
      if (!memberIds.has(targetUserId)) throw new Error('Unauthorized')
    }
  } else {
    if (targetUserId !== user.id) throw new Error('Unauthorized')
  }

  const { error } = await service.from('orders').insert({
    account_id: targetUserId,
    placed_by: user.id,
    vendor_id: orderData.vendorId || null,
    lead_types: [orderData.leadType],
    daily_budget: orderData.dailyBudget,
    states: orderData.states,
    availability: orderData.availability,
    status: 'active',
  })
  if (error) throw new Error('Failed to place order')

  revalidatePath('/orders')
}

async function requireOrderAccess(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) throw new Error('Unauthorized')
  const service = createServiceClient()
  if (profile.role !== 'super_admin' && profile.role !== 'team_admin') throw new Error('Unauthorized')
  return { service, callerId: user.id }
}

export async function addOrderAgent(orderId: string, userId: string) {
  const { service } = await requireOrderAccess(orderId)
  const { error } = await service.from('order_agents').upsert({ order_id: orderId, user_id: userId })
  if (error) throw new Error('Failed to add agent')
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}

export async function removeOrderAgent(orderId: string, userId: string) {
  const { service } = await requireOrderAccess(orderId)
  const { error } = await service.from('order_agents').delete().eq('order_id', orderId).eq('user_id', userId)
  if (error) throw new Error('Failed to remove agent')
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}

export async function archiveOrder(orderId: string, currentStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const update: Record<string, unknown> = { archived: true }
  if (currentStatus === 'active') update.status = 'completed'
  const { error } = await supabase.from('orders').update(update).eq('id', orderId)
  if (error) throw new Error('Failed to archive order')
  revalidatePath('/orders')
}

export async function unarchiveOrder(orderId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { error } = await supabase.from('orders').update({ archived: false }).eq('id', orderId)
  if (error) throw new Error('Failed to unarchive order')
  revalidatePath('/orders')
}

export async function transferOrder(orderId: string, newAccountId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'team_admin')) throw new Error('Unauthorized')

  const service = createServiceClient()

  if (profile.role === 'team_admin') {
    const { data: assignments } = await service.from('team_admin_assignments').select('team_id').eq('user_id', user.id)
    const teamIds = (assignments ?? []).map((a: { team_id: string }) => a.team_id)
    const { data: members } = await service
      .from('team_members').select('user_id')
      .in('team_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
    const memberIds = new Set((members ?? []).map((m: { user_id: string }) => m.user_id))
    if (!memberIds.has(newAccountId) && newAccountId !== user.id) throw new Error('Unauthorized')
  }

  const { error } = await service.from('orders').update({ account_id: newAccountId }).eq('id', orderId)
  if (error) throw new Error('Failed to transfer order')
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}
