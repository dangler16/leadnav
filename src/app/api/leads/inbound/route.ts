import { createServiceClient } from '@/lib/supabase/service'
import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

async function nextEligibleOrder(
  supabase: ReturnType<typeof createServiceClient>,
  vendorId: string,
  stateAbbr: string,
  leadType: string | null,
): Promise<{ agentId: string; orderId: string } | null> {
  let query = supabase
    .from('orders')
    .select('id, account_id')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .eq('archived', false)
    .contains('states', [stateAbbr])
    .not('account_id', 'is', null)

  if (leadType) {
    query = query.contains('lead_types', [leadType])
  }

  const { data: matchingOrders } = await query
  if (!matchingOrders || matchingOrders.length === 0) return null

  // Map each agent to their first matching order
  const agentOrderMap = new Map<string, string>()
  for (const order of matchingOrders) {
    if (order.account_id && !agentOrderMap.has(order.account_id)) {
      agentOrderMap.set(order.account_id, order.id)
    }
  }

  const accountIds = [...agentOrderMap.keys()]
  const { data: agents } = await supabase
    .from('profiles')
    .select('id')
    .in('id', accountIds)
    .order('created_at')

  if (!agents || agents.length === 0) return null

  const { data: lastLead } = await supabase
    .from('leads')
    .select('assigned_to')
    .not('assigned_to', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastIndex = agents.findIndex(a => a.id === lastLead?.assigned_to)
  const nextAgent = agents[(lastIndex + 1) % agents.length]

  return { agentId: nextAgent.id, orderId: agentOrderMap.get(nextAgent.id)! }
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return Response.json({ error: 'Missing API key' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  const { data: keyRecord } = await supabase
    .from('vendor_api_keys')
    .select('id, vendor_id, is_active')
    .eq('key_hash', keyHash)
    .single()

  if (!keyRecord || !keyRecord.is_active) {
    return Response.json({ error: 'Invalid or inactive API key' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const STATE_NAME_TO_ABBR: Record<string, string> = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
    colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
    hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
    kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
    massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
    missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
    oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
    virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  }
  const ABBR_TO_STATE_NAME: Record<string, string> = Object.fromEntries(
    Object.entries(STATE_NAME_TO_ABBR).map(([name, abbr]) => [abbr, name.replace(/\b\w/g, c => c.toUpperCase())])
  )
  const rawState = body.state ? String(body.state).trim() : null
  const stateAbbr = rawState
    ? (STATE_NAME_TO_ABBR[rawState.toLowerCase()] ?? rawState.toUpperCase())
    : null
  const stateFull = stateAbbr ? (ABBR_TO_STATE_NAME[stateAbbr] ?? rawState) : null
  if (!stateAbbr) {
    return Response.json({ error: 'Missing required field: state' }, { status: 400 })
  }

  // Fetch vendor early — needed to determine lead type before order matching
  const { data: vendor } = await supabase
    .from('vendors')
    .select('lead_types, cost_per_lead, lead_type_costs')
    .eq('id', keyRecord.vendor_id)
    .single()

  // Use lead_type from body if provided, otherwise fall back to vendor's first type
  const leadType = body.lead_type
    ? String(body.lead_type)
    : (vendor?.lead_types?.[0] ?? null)

  // Find the next eligible agent whose active order covers this vendor, state, and lead type
  const assignment = await nextEligibleOrder(supabase, keyRecord.vendor_id, stateAbbr, leadType)

  if (!assignment) {
    return Response.json({ error: 'No active orders for this vendor in this state' }, { status: 503 })
  }

  // Duplicate check: same name + same phone or email
  const firstname = body.firstname ? String(body.firstname) : null
  const lastname = body.lastname ? String(body.lastname) : null
  const phone = body.phone ? String(body.phone) : null
  const email = body.email ? String(body.email) : null

  if (firstname && lastname && (phone || email)) {
    const orParts: string[] = []
    if (phone) orParts.push(`phone.eq.${phone}`)
    if (email) orParts.push(`email.eq.${email}`)

    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('firstname', firstname)
      .eq('lastname', lastname)
      .or(orParts.join(','))
      .limit(1)
      .maybeSingle()

    if (existing) {
      return Response.json({ id: existing.id, duplicate: true })
    }
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      vendor_id: keyRecord.vendor_id,
      order_id: assignment.orderId,
      assigned_to: assignment.agentId,
      lead_type: leadType,
      firstname,
      lastname,
      birthday: body.birthday ?? null,
      email,
      phone,
      state: stateFull,
      zip: body.zip ?? null,
      plan_for: body.plan_for ?? null,
      looking_for: body.looking_for ?? null,
      income: body.income != null ? Number(body.income) : null,
      household: body.household != null ? Number(body.household) : null,
      utm_source: body.utm_source ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_medium: body.utm_medium ?? null,
      status: 'new',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[inbound lead]', error)
    return Response.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  // Deduct lead cost from assigned agent's wallet
  const costPerLead: number | null =
    (leadType && (vendor?.lead_type_costs as Record<string, number> | null)?.[leadType]) ??
    (vendor?.cost_per_lead as number | null) ??
    null

  if (costPerLead != null && costPerLead > 0) {
    const costCents = Math.round(costPerLead * 100)
    const { data: deducted } = await supabase.rpc('deduct_wallet', {
      p_user_id: assignment.agentId,
      p_amount_cents: costCents,
      p_lead_id: lead.id,
      p_description: `Lead delivered — ${leadType ?? 'unknown type'}`,
    })

    if (!deducted) {
      console.warn('[inbound lead] insufficient wallet balance for agent', assignment.agentId)
      await supabase
        .from('orders')
        .update({ status: 'paused' })
        .eq('account_id', assignment.agentId)
        .eq('status', 'active')
    }
  }

  await supabase
    .from('vendor_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)

  return Response.json({ id: lead.id })
}
