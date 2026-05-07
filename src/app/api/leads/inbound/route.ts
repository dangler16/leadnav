import { createServiceClient } from '@/lib/supabase/service'
import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

async function nextAgentId(supabase: ReturnType<typeof createServiceClient>): Promise<string | null> {
  const { data: agents } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'agent')
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

  // Fetch vendor to get configured lead type
  const { data: vendor } = await supabase
    .from('vendors')
    .select('lead_types')
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
      assigned_to,
      lead_type: vendor?.lead_types?.[0] ?? null,
      firstname,
      lastname,
      birthday: body.birthday ?? null,
      email,
      phone,
      state: body.state ?? null,
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

  await supabase
    .from('vendor_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)

  return Response.json({ id: lead.id })
}
