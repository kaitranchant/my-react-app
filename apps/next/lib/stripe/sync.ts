import type Stripe from 'stripe'

import type { PaidSubscriptionPlan } from '@/lib/stripe/prices'
import { getPlanFromStripePriceId } from '@/lib/stripe/prices'
import { FACILITY_INCLUDED_COACH_SEATS } from '@/lib/subscription-plans'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SubscriptionPlan, SubscriptionStatus } from 'app/types/database'

export type BillingScope = 'coach' | 'facility'

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
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
      return 'canceled'
  }
}

export function isEntitledSubscriptionStatus(
  status: SubscriptionStatus | null | undefined
): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
}

function resolvePlanFromSubscription(
  subscription: Stripe.Subscription
): PaidSubscriptionPlan | null {
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return null
  return getPlanFromStripePriceId(priceId)?.plan ?? null
}

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end
  return end ? new Date(end * 1000).toISOString() : null
}

export async function syncCoachStripeSubscription(params: {
  coachId: string
  subscription: Stripe.Subscription
  plan?: PaidSubscriptionPlan
}) {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const plan = params.plan ?? resolvePlanFromSubscription(params.subscription)
  if (!plan) {
    throw new Error('Could not resolve subscription plan.')
  }

  const status = mapStripeSubscriptionStatus(params.subscription.status)
  const entitled = isEntitledSubscriptionStatus(status)
  const customerId =
    typeof params.subscription.customer === 'string'
      ? params.subscription.customer
      : params.subscription.customer?.id ?? null

  const { error } = await admin
    .from('profiles')
    .update({
      subscription_plan: entitled ? plan : 'starter',
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: params.subscription.id,
      subscription_current_period_end: periodEndIso(params.subscription),
    })
    .eq('id', params.coachId)

  if (error) {
    throw error
  }
}

export async function syncFacilityStripeSubscription(params: {
  gymId: string
  coachId: string
  subscription: Stripe.Subscription
}) {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const status = mapStripeSubscriptionStatus(params.subscription.status)
  const entitled = isEntitledSubscriptionStatus(status)
  const customerId =
    typeof params.subscription.customer === 'string'
      ? params.subscription.customer
      : params.subscription.customer?.id ?? null

  const { error: gymError } = await admin.from('gym_subscriptions').upsert(
    {
      gym_id: params.gymId,
      plan: 'facility',
      status,
      included_coach_seats: FACILITY_INCLUDED_COACH_SEATS,
      stripe_customer_id: customerId,
      stripe_subscription_id: params.subscription.id,
      current_period_end: periodEndIso(params.subscription),
    },
    { onConflict: 'gym_id' }
  )

  if (gymError) {
    throw gymError
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      subscription_plan: entitled ? 'facility' : 'starter',
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: params.subscription.id,
      subscription_current_period_end: periodEndIso(params.subscription),
    })
    .eq('id', params.coachId)

  if (profileError) {
    throw profileError
  }
}

export async function clearCoachStripeSubscription(coachId: string) {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { error } = await admin
    .from('profiles')
    .update({
      subscription_plan: 'starter',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      subscription_current_period_end: null,
    })
    .eq('id', coachId)

  if (error) {
    throw error
  }
}

export async function clearFacilityStripeSubscription(params: {
  gymId: string
  coachId: string
}) {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { error: gymError } = await admin
    .from('gym_subscriptions')
    .update({
      status: 'canceled',
      stripe_subscription_id: null,
      current_period_end: null,
    })
    .eq('gym_id', params.gymId)

  if (gymError) {
    throw gymError
  }

  await clearCoachStripeSubscription(params.coachId)
}

export function getBillingScopeFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): BillingScope {
  return metadata?.billing_scope === 'facility' ? 'facility' : 'coach'
}

export function getCoachIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const coachId = metadata?.coach_id?.trim()
  return coachId || null
}

export function getGymIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const gymId = metadata?.gym_id?.trim()
  return gymId || null
}

export function planFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): SubscriptionPlan | null {
  const plan = metadata?.plan?.trim()
  if (
    plan === 'growth' ||
    plan === 'scale' ||
    plan === 'facility' ||
    plan === 'starter'
  ) {
    return plan
  }
  return null
}
