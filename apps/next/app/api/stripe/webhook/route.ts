import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { getStripeClient, getStripeWebhookSecret } from '@/lib/stripe/config'
import {
  clearCoachStripeSubscription,
  clearFacilityStripeSubscription,
  getBillingScopeFromMetadata,
  getCoachIdFromMetadata,
  getGymIdFromMetadata,
  syncCoachStripeSubscription,
  syncFacilityStripeSubscription,
} from '@/lib/stripe/sync'

export const dynamic = 'force-dynamic'

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const metadata = subscription.metadata
  const coachId = getCoachIdFromMetadata(metadata)
  if (!coachId) return

  const billingScope = getBillingScopeFromMetadata(metadata)

  if (billingScope === 'facility') {
    const gymId = getGymIdFromMetadata(metadata)
    if (!gymId) {
      await syncCoachStripeSubscription({
        coachId,
        subscription,
        plan: 'facility',
      })
      return
    }

    await syncFacilityStripeSubscription({
      gymId,
      coachId,
      subscription,
    })
    return
  }

  if (
    subscription.status === 'canceled' ||
    subscription.status === 'incomplete_expired'
  ) {
    await clearCoachStripeSubscription(coachId)
    return
  }

  await syncCoachStripeSubscription({ coachId, subscription })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const coachId = getCoachIdFromMetadata(subscription.metadata)
  if (!coachId) return

  const billingScope = getBillingScopeFromMetadata(subscription.metadata)
  const gymId = getGymIdFromMetadata(subscription.metadata)

  if (billingScope === 'facility' && gymId) {
    await clearFacilityStripeSubscription({ gymId, coachId })
    return
  }

  await clearCoachStripeSubscription(coachId)
}

export async function POST(request: Request) {
  const webhookSecret = getStripeWebhookSecret()
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook secret is not configured.' },
      { status: 503 }
    )
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  const body = await request.text()
  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid webhook signature.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          subscription.metadata = {
            ...subscription.metadata,
            ...session.metadata,
          }
          await handleSubscriptionChange(subscription)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      }
      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      }
      default:
        break
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Webhook handler failed.'
    console.error('[stripe webhook]', event.type, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
