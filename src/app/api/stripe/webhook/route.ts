import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  if (!sig) return Response.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const raw = await request.text()
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.metadata?.type !== 'wallet_topup') {
      return Response.json({ received: true })
    }

    const userId = session.metadata?.user_id
    const amountCents = session.amount_total

    if (!userId || !amountCents) {
      console.error('[stripe webhook] missing user_id or amount_total', session)
      return Response.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.rpc('credit_wallet', {
      p_user_id: userId,
      p_amount_cents: amountCents,
      p_stripe_payment_intent: session.payment_intent as string | null,
      p_description: 'Wallet top-up via Stripe',
    })

    if (error) {
      console.error('[stripe webhook] credit_wallet failed', error)
      return Response.json({ error: 'Failed to credit wallet' }, { status: 500 })
    }
  }

  return Response.json({ received: true })
}
