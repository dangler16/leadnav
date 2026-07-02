import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import type Stripe from 'stripe'

function paymentReference(session: Stripe.Checkout.Session): string {
  if (typeof session.payment_intent === 'string') return session.payment_intent
  if (session.payment_intent && typeof session.payment_intent === 'object') {
    return session.payment_intent.id
  }
  return `checkout:${session.id}`
}

async function creditWalletFromSession(session: Stripe.Checkout.Session) {
  if (session.metadata?.type !== 'wallet_topup') return
  if (session.payment_status !== 'paid') return

  const userId = session.metadata.user_id
  const amountCents = session.amount_total

  if (!userId || !amountCents || amountCents <= 0) {
    throw new Error('Wallet checkout is missing required metadata')
  }

  const supabase = createServiceClient()
  const { error } = await supabase.rpc('credit_wallet', {
    p_user_id: userId,
    p_amount_cents: amountCents,
    p_stripe_payment_intent: paymentReference(session),
    p_description: 'Wallet top-up via Stripe',
  })

  if (error) throw error
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return Response.json({ error: 'Stripe webhook is not configured' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const rawBody = await request.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (error) {
    console.error('[stripe webhook] signature verification failed', error)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (
      event.type === 'checkout.session.completed'
      || event.type === 'checkout.session.async_payment_succeeded'
    ) {
      await creditWalletFromSession(event.data.object as Stripe.Checkout.Session)
    }
  } catch (error) {
    console.error('[stripe webhook] wallet credit failed', error)
    return Response.json({ error: 'Failed to credit wallet' }, { status: 500 })
  }

  return Response.json({ received: true })
}
