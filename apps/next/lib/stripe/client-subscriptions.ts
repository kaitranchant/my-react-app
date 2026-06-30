import type Stripe from 'stripe'

import { getOrCreateConnectClientCustomer } from '@/lib/stripe/connect-client-customer'
import {
  getClientBillingCancelUrl,
  getClientBillingSuccessUrl,
} from '@/lib/stripe/connect'
import { getStripeClient } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ClientBillingInterval,
  ClientSubscriptionStatus,
  Database,
} from 'app/types/database'

type DbClient = SupabaseClient<Database>

export type CreateClientSubscriptionInput = {
  supabase: DbClient
  coachId: string
  connectAccountId: string
  clientId: string
  clientEmail: string
  clientName: string
  amountCents: number
  interval: ClientBillingInterval
  description: string
  currency?: string
}

export type CreateClientSubscriptionResult =
  | { success: true; subscriptionId: string; checkoutUrl: string }
  | { success: false; error: string }

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): ClientSubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete'
    case 'unpaid':
      return 'past_due'
    case 'paused':
      return 'canceled'
    default:
      return 'incomplete'
  }
}

function stripeInterval(interval: ClientBillingInterval): 'month' | 'year' {
  return interval
}

export async function createClientStripeSubscription(
  input: CreateClientSubscriptionInput
): Promise<CreateClientSubscriptionResult> {
  const admin = createAdminClient()
  if (!admin) {
    return { success: false, error: 'Billing service is unavailable.' }
  }

  if (input.amountCents <= 0) {
    return { success: false, error: 'Amount must be greater than zero.' }
  }

  const description = input.description.trim()
  if (!description) {
    return { success: false, error: 'Description is required.' }
  }

  try {
    const customerId = await getOrCreateConnectClientCustomer({
      supabase: input.supabase,
      connectAccountId: input.connectAccountId,
      clientId: input.clientId,
      email: input.clientEmail,
      name: input.clientName,
    })

    const stripe = getStripeClient()
    const currency = input.currency ?? 'usd'

    const product = await stripe.products.create(
      {
        name: description,
        metadata: {
          billing_scope: 'client',
          coach_id: input.coachId,
          client_id: input.clientId,
        },
      },
      { stripeAccount: input.connectAccountId }
    )

    const price = await stripe.prices.create(
      {
        product: product.id,
        unit_amount: input.amountCents,
        currency,
        recurring: {
          interval: stripeInterval(input.interval),
        },
        metadata: {
          billing_scope: 'client',
          coach_id: input.coachId,
          client_id: input.clientId,
        },
      },
      { stripeAccount: input.connectAccountId }
    )

    const { data: localSubscription, error: insertError } = await admin
      .from('client_billing_subscriptions')
      .insert({
        coach_id: input.coachId,
        client_id: input.clientId,
        amount_cents: input.amountCents,
        interval: input.interval,
        currency,
        description,
        status: 'incomplete',
        stripe_price_id: price.id,
      })
      .select('id')
      .single()

    if (insertError || !localSubscription) {
      return {
        success: false,
        error: insertError?.message ?? 'Could not create subscription record.',
      }
    }

    const metadata = {
      billing_scope: 'client',
      coach_id: input.coachId,
      client_id: input.clientId,
      local_subscription_id: localSubscription.id,
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: getClientBillingSuccessUrl(),
        cancel_url: getClientBillingCancelUrl(),
        metadata,
        subscription_data: {
          metadata,
        },
      },
      { stripeAccount: input.connectAccountId }
    )

    if (!session.url) {
      return { success: false, error: 'Could not start checkout.' }
    }

    const { error: updateError } = await admin
      .from('client_billing_subscriptions')
      .update({
        checkout_session_id: session.id,
        checkout_url: session.url,
      })
      .eq('id', localSubscription.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return {
      success: true,
      subscriptionId: localSubscription.id,
      checkoutUrl: session.url,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not create subscription.'
    return { success: false, error: message }
  }
}

export async function cancelClientStripeSubscription(params: {
  connectAccountId: string
  stripeSubscriptionId: string
  localSubscriptionId: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const admin = createAdminClient()
  if (!admin) {
    return { success: false, error: 'Billing service is unavailable.' }
  }

  try {
    const stripe = getStripeClient()
    const subscription = await stripe.subscriptions.update(
      params.stripeSubscriptionId,
      { cancel_at_period_end: true },
      { stripeAccount: params.connectAccountId }
    )

    const { error } = await admin
      .from('client_billing_subscriptions')
      .update({
        status: mapStripeSubscriptionStatus(subscription.status),
        current_period_end: subscription.items.data[0]?.current_period_end
          ? new Date(
              subscription.items.data[0].current_period_end * 1000
            ).toISOString()
          : null,
      })
      .eq('id', params.localSubscriptionId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not cancel subscription.'
    return { success: false, error: message }
  }
}

export function mapStripeSubscriptionToLocal(subscription: Stripe.Subscription): {
  status: ClientSubscriptionStatus
  stripe_subscription_id: string
  current_period_end: string | null
  canceled_at: string | null
} {
  const periodEnd = subscription.items.data[0]?.current_period_end
  return {
    status: mapStripeSubscriptionStatus(subscription.status),
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  }
}

export { mapStripeSubscriptionStatus }
