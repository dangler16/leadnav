import { createServiceClient } from '@/lib/supabase/service'
import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'

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

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      vendor_id: keyRecord.vendor_id,
      firstname: body.firstname ?? null,
      lastname: body.lastname ?? null,
      birthday: body.birthday ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
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
