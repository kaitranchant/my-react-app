import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import {
  isClientBillingMetadata,
  linkClientSubscriptionFromCheckout,
  syncClientInvoiceFromStripe,
  syncClientSubscriptionFromStripe,
  syncConnectAccountUpdated,
} from '@/lib/stripe/client-billing-sync'
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

async function handlePlatformSubscriptionChange(subscription: Stripe.Subscription) {
  if (isClientBillingMetadata(subscription.metadata)) {
    return
  }

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

async function handlePlatformSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (isClientBillingMetadata(subscription.metadata)) {
    return
  }

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

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  connectAccountId?: string | null
) {
  if (session.metadata?.billing_scope === 'client') {
    await linkClientSubscriptionFromCheckout(session)

    if (session.mode === 'subscription' && session.subscription && connectAccountId) {
      const stripe = getStripeClient()
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id
      const subscription = await stripe.subscriptions.retrieve(
        subscriptionId,
        {},
        { stripeAccount: connectAccountId }
      )
      subscription.metadata = {
        ...subscription.metadata,
        ...session.metadata,
      }
      await syncClientSubscriptionFromStripe(subscription)
    }
    return
  }

  if (session.mode === 'subscription' && session.subscription) {
    const stripe = getStripeClient()
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    subscription.metadata = {
      ...subscription.metadata,
      ...session.metadata,
    }
    await handlePlatformSubscriptionChange(subscription)
  }
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

  const connectAccountId =
    typeof event.account === 'string' ? event.account : null

  try {
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await syncConnectAccountUpdated(account)
        break
      }
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          connectAccountId
        )
        break
      }
      case 'invoice.finalized':
      case 'invoice.paid':
      case 'invoice.voided':
      case 'invoice.marked_uncollectible': {
        const invoice = event.data.object as Stripe.Invoice
        if (isClientBillingMetadata(invoice.metadata)) {
          await syncClientInvoiceFromStripe(invoice, connectAccountId)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        if (isClientBillingMetadata(subscription.metadata)) {
          await syncClientSubscriptionFromStripe(subscription)
        } else if (!connectAccountId) {
          await handlePlatformSubscriptionChange(subscription)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        if (isClientBillingMetadata(subscription.metadata)) {
          await syncClientSubscriptionFromStripe(subscription)
        } else if (!connectAccountId) {
          await handlePlatformSubscriptionDeleted(subscription)
        }
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
