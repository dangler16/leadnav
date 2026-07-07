import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'

const MIN_TOP_UP_CENTS = 100
const MAX_TOP_UP_CENTS = 10_000_000

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let amountCents: number
  try {
    const body = await request.json()
    amountCents = Math.round(Number(body.amount_cents))
    if (!Number.isFinite(amountCents) || amountCents < MIN_TOP_UP_CENTS) {
      return Response.json({ error: 'Minimum top-up is $1.00' }, { status: 400 })
    }
    if (amountCents > MAX_TOP_UP_CENTS) {
      return Response.json({ error: 'Maximum top-up is $100,000.00' }, { status: 400 })
    }
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('stripe_customer_id, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return Response.json({ error: 'Profile not found' }, { status: 404 })
  }

  let customerId = profile.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    const { error: customerUpdateError } = await service
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)

    if (customerUpdateError) {
      return Response.json({ error: 'Failed to save Stripe customer' }, { status: 500 })
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

  try {
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
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          type: 'wallet_topup',
        },
      },
      success_url: `${appUrl}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing`,
    })

    if (!session.url) {
      return Response.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[stripe checkout] failed to create session', error)
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
