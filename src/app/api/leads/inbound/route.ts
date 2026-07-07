import { createServiceClient } from '@/lib/supabase/service'
import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

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

const VALID_STATE_ABBRS = new Set(Object.values(STATE_NAME_TO_ABBR))
const ABBR_TO_STATE_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_TO_ABBR).map(([name, abbr]) => [
    abbr,
    name.replace(/\b\w/g, character => character.toUpperCase()),
  ])
)

function textValue(value: unknown, maxLength = 255): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text ? text.slice(0, maxLength) : null
}

function normalizeEmail(value: unknown): string | null {
  const email = textValue(value, 320)?.toLowerCase() ?? null
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function normalizePhone(value: unknown): string | null {
  const raw = textValue(value, 40)
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 ? digits : null
}

function normalizeBirthday(value: unknown): string | null {
  const raw = textValue(value, 40)
  if (!raw) return null

  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00.000Z`)
    : new Date(raw)

  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) return null
  return date.toISOString().slice(0, 10)
}

function leadTypeFromBirthday(birthday: string | null): 'ACA' | 'Medicare' | null {
  if (!birthday) return null
  const [year, month, day] = birthday.split('-').map(Number)
  if (!year || !month || !day) return null

  const today = new Date()
  let age = today.getUTCFullYear() - year
  const monthDifference = today.getUTCMonth() + 1 - month
  if (monthDifference < 0 || (monthDifference === 0 && today.getUTCDate() < day)) age--
  return age >= 65 ? 'Medicare' : 'ACA'
}

function currentAvailabilityDay(): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: process.env.APP_TIME_ZONE ?? 'America/Denver',
    }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date())
  }
}

async function nextEligibleOrder(
  supabase: ReturnType<typeof createServiceClient>,
  vendorId: string,
  stateAbbr: string,
  leadType: string | null,
  costCents: number,
): Promise<{ agentId: string; orderId: string } | null> {
  let query = supabase
    .from('orders')
    .select('id, account_id, daily_budget, availability, created_at')
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .eq('archived', false)
    .contains('states', [stateAbbr])
    .not('account_id', 'is', null)
    .order('created_at')

  if (leadType) query = query.contains('lead_types', [leadType])

  const { data: matchingOrders, error: orderError } = await query
  if (orderError || !matchingOrders || matchingOrders.length === 0) return null

  const today = currentAvailabilityDay()
  const availableOrders = matchingOrders.filter(order => {
    const availability = Array.isArray(order.availability) ? order.availability : []
    return availability.length === 0 || availability.includes(today)
  })
  if (availableOrders.length === 0) return null

  const accountIds = [...new Set(availableOrders.map(order => order.account_id).filter(Boolean))] as string[]
  const orderIds = availableOrders.map(order => order.id)

  const [{ data: profiles }, { data: spendRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, wallet_balance_cents, created_at')
      .in('id', accountIds)
      .order('created_at'),
    supabase.rpc('get_order_spend_today', { p_order_ids: orderIds }),
  ])

  if (!profiles || profiles.length === 0) return null

  const balanceByAgent = new Map<string, number>(
    profiles.map(profile => [profile.id, Number(profile.wallet_balance_cents ?? 0)])
  )
  const spendByOrder = new Map<string, number>(
    (spendRows ?? []).map((row: { order_id: string; spent_cents: number | string }) => [
      row.order_id,
      Number(row.spent_cents ?? 0),
    ])
  )

  const insufficientOrderIds: string[] = []
  const orderByAgent = new Map<string, string>()

  for (const order of availableOrders) {
    if (!order.account_id || orderByAgent.has(order.account_id)) continue

    const balance = balanceByAgent.get(order.account_id) ?? 0
    if (costCents > 0 && balance < costCents) {
      insufficientOrderIds.push(order.id)
      continue
    }

    if (order.daily_budget != null) {
      const budgetCents = Math.round(Number(order.daily_budget) * 100)
      const spentCents = spendByOrder.get(order.id) ?? 0
      if (spentCents + costCents > budgetCents) continue
    }

    orderByAgent.set(order.account_id, order.id)
  }

  if (insufficientOrderIds.length > 0) {
    await supabase.from('orders').update({ status: 'paused' }).in('id', insufficientOrderIds)
  }

  const eligibleAgentIds = profiles
    .map(profile => profile.id)
    .filter(agentId => orderByAgent.has(agentId))

  if (eligibleAgentIds.length === 0) return null

  const { data: lastLead } = await supabase
    .from('leads')
    .select('assigned_to')
    .in('assigned_to', eligibleAgentIds)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastIndex = eligibleAgentIds.findIndex(agentId => agentId === lastLead?.assigned_to)
  const agentId = eligibleAgentIds[(lastIndex + 1) % eligibleAgentIds.length]
  return { agentId, orderId: orderByAgent.get(agentId)! }
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return Response.json({ error: 'Missing API key' }, { status: 401 })

  const supabase = createServiceClient()
  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  const { data: keyRecord } = await supabase
    .from('vendor_api_keys')
    .select('id, vendor_id, is_active')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (!keyRecord?.is_active) {
    return Response.json({ error: 'Invalid or inactive API key' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    const parsed = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body')
    body = parsed as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rawState = textValue(body.state, 50)
  const stateAbbr = rawState
    ? (STATE_NAME_TO_ABBR[rawState.toLowerCase()] ?? rawState.toUpperCase())
    : null

  if (!stateAbbr) {
    return Response.json({ error: 'Missing required field: state' }, { status: 400 })
  }
  if (!VALID_STATE_ABBRS.has(stateAbbr)) {
    return Response.json({ error: 'Invalid state' }, { status: 400 })
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('name, lead_types, cost_per_lead, lead_type_costs, locations, is_active')
    .eq('id', keyRecord.vendor_id)
    .maybeSingle()

  if (!vendor?.is_active) {
    return Response.json({ error: 'Vendor is inactive or unavailable' }, { status: 403 })
  }

  const vendorLocations = Array.isArray(vendor.locations) ? vendor.locations : []
  if (vendorLocations.length > 0 && !vendorLocations.includes(stateAbbr)) {
    return Response.json({ error: 'Vendor is not configured for this state' }, { status: 400 })
  }

  const rawBirthday = textValue(body.birthday, 40)
  const birthday = normalizeBirthday(rawBirthday)
  if (rawBirthday && !birthday) {
    return Response.json({ error: 'Invalid birthday' }, { status: 400 })
  }

  const vendorLeadTypes = Array.isArray(vendor.lead_types) ? vendor.lead_types : []
  const requestedLeadType = textValue(body.lead_type, 80)
  const matchedRequestedType = requestedLeadType
    ? vendorLeadTypes.find(type => type.toLowerCase() === requestedLeadType.toLowerCase()) ?? requestedLeadType
    : null
  const leadType = leadTypeFromBirthday(birthday) ?? matchedRequestedType ?? vendorLeadTypes[0] ?? null

  if (leadType && vendorLeadTypes.length > 0 && !vendorLeadTypes.includes(leadType)) {
    return Response.json({ error: 'Vendor does not support this lead type' }, { status: 400 })
  }

  const leadTypeCosts = (vendor.lead_type_costs ?? {}) as Record<string, number | string>
  const rawCost = leadType ? leadTypeCosts[leadType] : null
  const costPerLead = rawCost != null ? Number(rawCost) : Number(vendor.cost_per_lead ?? 0)
  const costCents = Number.isFinite(costPerLead) && costPerLead > 0
    ? Math.round(costPerLead * 100)
    : 0

  const firstname = textValue(body.firstname ?? body.first_name, 100)
  const lastname = textValue(body.lastname ?? body.last_name, 100)
  const rawPhone = textValue(body.phone, 40)
  const rawEmail = textValue(body.email, 320)
  const phone = normalizePhone(rawPhone)
  const email = normalizeEmail(rawEmail)

  if (rawPhone && !phone) return Response.json({ error: 'Invalid phone number' }, { status: 400 })
  if (rawEmail && !email) return Response.json({ error: 'Invalid email address' }, { status: 400 })
  if (!phone && !email) {
    return Response.json({ error: 'A valid phone number or email address is required' }, { status: 400 })
  }

  let income: number | null = null
  if (body.income != null && body.income !== '') {
    income = Number(body.income)
    if (!Number.isFinite(income) || income < 0) {
      return Response.json({ error: 'Invalid income' }, { status: 400 })
    }
  }

  let household: number | null = null
  if (body.household != null && body.household !== '') {
    household = Number(body.household)
    if (!Number.isInteger(household) || household < 1 || household > 100) {
      return Response.json({ error: 'Invalid household size' }, { status: 400 })
    }
  }

  if (firstname && lastname && phone) {
    const { data: existingByPhone } = await supabase
      .from('leads')
      .select('id')
      .eq('firstname', firstname)
      .eq('lastname', lastname)
      .eq('phone', phone)
      .limit(1)
      .maybeSingle()

    if (existingByPhone) {
      await supabase.from('vendor_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id)
      return Response.json({ id: existingByPhone.id, duplicate: true })
    }
  }

  if (firstname && lastname && email) {
    const { data: existingByEmail } = await supabase
      .from('leads')
      .select('id')
      .eq('firstname', firstname)
      .eq('lastname', lastname)
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (existingByEmail) {
      await supabase.from('vendor_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyRecord.id)
      return Response.json({ id: existingByEmail.id, duplicate: true })
    }
  }

  const assignment = await nextEligibleOrder(
    supabase,
    keyRecord.vendor_id,
    stateAbbr,
    leadType,
    costCents,
  )

  if (!assignment) {
    return Response.json({ error: 'No eligible active order is currently available' }, { status: 503 })
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      vendor_id: keyRecord.vendor_id,
      order_id: assignment.orderId,
      assigned_to: assignment.agentId,
      lead_type: leadType,
      firstname,
      lastname,
      birthday,
      email,
      phone,
      state: ABBR_TO_STATE_NAME[stateAbbr],
      zip: textValue(body.zip, 20),
      plan_for: textValue(body.plan_for, 150),
      looking_for: textValue(body.looking_for, 150),
      income,
      household,
      utm_source: textValue(body.utm_source, 255),
      utm_campaign: textValue(body.utm_campaign, 255),
      utm_medium: textValue(body.utm_medium, 255),
      status: 'new',
    })
    .select('id')
    .single()

  if (leadError || !lead) {
    console.error('[inbound lead] failed to create lead', leadError)
    return Response.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  if (costCents > 0) {
    const { data: deducted, error: deductionError } = await supabase.rpc('deduct_wallet', {
      p_user_id: assignment.agentId,
      p_amount_cents: costCents,
      p_lead_id: lead.id,
      p_order_id: assignment.orderId,
      p_description: `Lead delivered — ${leadType ?? 'unknown type'}`,
    })

    if (deductionError || !deducted) {
      console.warn('[inbound lead] wallet deduction failed', deductionError)
      await Promise.all([
        supabase.from('leads').delete().eq('id', lead.id),
        supabase.from('orders').update({ status: 'paused' }).eq('id', assignment.orderId),
      ])
      return Response.json({ error: 'Order is unavailable because its wallet balance is insufficient' }, { status: 503 })
    }
  }

  const leadName = [firstname, lastname].filter(Boolean).join(' ') || 'New lead'
  await Promise.all([
    supabase.from('notifications').insert({
      user_id: assignment.agentId,
      type: 'new_lead',
      title: `New lead assigned: ${leadName}`,
      body: `${leadType ?? 'Lead'} from ${vendor.name}`,
      link: `/leads/${lead.id}`,
      read: false,
    }),
    supabase
      .from('vendor_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id),
  ])

  return Response.json(
    { id: lead.id, assigned_to: assignment.agentId, order_id: assignment.orderId },
    { status: 201 },
  )
}
