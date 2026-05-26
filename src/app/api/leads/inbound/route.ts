import { createServiceClient } from '@/lib/supabase/service'
import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

async function nextAgentId(supabase: ReturnType<typeof createServiceClient>): Promise<string | null> {
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('account_id')
    .eq('status', 'active')

  const accountIds = [...new Set((activeOrders ?? []).map(o => o.account_id).filter(Boolean))]
  if (accountIds.length === 0) return null

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
  return agents[(lastIndex + 1) % agents.length].id
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
  // Normalize to abbreviation for order matching; store the full name
  const stateAbbr = rawState
    ? (STATE_NAME_TO_ABBR[rawState.toLowerCase()] ?? rawState.toUpperCase())
    : null
  const stateFull = stateAbbr ? (ABBR_TO_STATE_NAME[stateAbbr] ?? rawState) : null
  if (!stateAbbr) {
    return Response.json({ error: 'Missing required field: state' }, { status: 400 })
  }

  // Block if no active order exists for this vendor that covers the lead's state
  const { data: activeOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('vendor_id', keyRecord.vendor_id)
    .eq('status', 'active')
    .contains('states', [stateAbbr])
    .limit(1)
    .maybeSingle()

  if (!activeOrder) {
    return Response.json({ error: 'No active orders for this vendor in this state' }, { status: 503 })
  }

  // Fetch vendor to get lead types and pricing
  const { data: vendor } = await supabase
    .from('vendors')
    .select('lead_types, cost_per_lead, lead_type_costs')
    .eq('id', keyRecord.vendor_id)
    .single()

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

  const [assigned_to] = await Promise.all([nextAgentId(supabase)])

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      vendor_id: keyRecord.vendor_id,
      order_id: activeOrder.id,
      assigned_to,
      lead_type: vendor?.lead_types?.[0] ?? null,
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
  if (assigned_to) {
    const leadType = vendor?.lead_types?.[0] ?? null
    const costPerLead: number | null =
      (leadType && (vendor?.lead_type_costs as Record<string, number> | null)?.[leadType]) ??
      (vendor?.cost_per_lead as number | null) ??
      null

    if (costPerLead != null && costPerLead > 0) {
      const costCents = Math.round(costPerLead * 100)
      const { data: deducted } = await supabase.rpc('deduct_wallet', {
        p_user_id: assigned_to,
        p_amount_cents: costCents,
        p_lead_id: lead.id,
        p_description: `Lead delivered — ${leadType ?? 'unknown type'}`,
      })

      // If deduction failed (insufficient balance), pause the agent's active orders
      if (!deducted) {
        console.warn('[inbound lead] insufficient wallet balance for agent', assigned_to)
        await supabase
          .from('orders')
          .update({ status: 'paused' })
          .eq('account_id', assigned_to)
          .eq('status', 'active')
      }
    }
  }

  await supabase
    .from('vendor_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)

  return Response.json({ id: lead.id })
}
