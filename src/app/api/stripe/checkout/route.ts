import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let amountCents: number
  try {
    const body = await request.json()
    amountCents = Math.round(Number(body.amount_cents))
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      return Response.json({ error: 'Minimum top-up is $1.00' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('stripe_customer_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await service.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'LeadNav Wallet Top-Up' },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
      type: 'wallet_topup',
    },
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing`,
  })

  return Response.json({ url: session.url })
}
