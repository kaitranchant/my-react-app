import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  getStripeCancelUrl,
  getStripeClient,
  getStripeSuccessUrl,
  isStripeConfigured,
} from '@/lib/stripe/config'
import { getOrCreateStripeCustomer } from '@/lib/stripe/customer'
import { getStripePriceId, isPaidPlan } from '@/lib/stripe/prices'
import type { BillingInterval, SubscriptionPlan } from '@/lib/subscription-plans'

const checkoutSchema = z.object({
  plan: z.enum(['growth', 'scale', 'facility']),
  interval: z.enum(['monthly', 'annual']),
  gymId: z.string().uuid().optional(),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>

export type CheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function createStripeCheckoutSession(
  input: CheckoutInput
): Promise<CheckoutResult> {
  if (!isStripeConfigured()) {
    return {
      success: false,
      error: 'Stripe billing is not configured yet.',
    }
  }

  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid checkout request.' }
  }

  const { plan, interval, gymId } = parsed.data

  if (!isPaidPlan(plan)) {
    return { success: false, error: 'This plan does not require checkout.' }
  }

  const priceId = getStripePriceId(plan, interval)
  if (!priceId) {
    return {
      success: false,
      error: `Stripe price is not configured for ${plan} (${interval}).`,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in to checkout.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, business_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return { success: false, error: 'Only coach accounts can purchase plans.' }
  }

  if (plan === 'facility' && gymId) {
    const { data: membership } = await supabase
      .from('gym_members')
      .select('role')
      .eq('gym_id', gymId)
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!membership || membership.role !== 'owner') {
      return {
        success: false,
        error: 'You must be the gym owner to purchase Facility for that gym.',
      }
    }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { success: false, error: 'Billing service is unavailable.' }
  }

  try {
    const customerId = await getOrCreateStripeCustomer({
      supabase,
      admin,
      coachId: user.id,
      email: user.email ?? '',
      name: profile?.business_name ?? profile?.full_name,
    })

    const stripe = getStripeClient()
    const billingScope = plan === 'facility' ? 'facility' : 'coach'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: getStripeSuccessUrl(),
      cancel_url: getStripeCancelUrl(),
      client_reference_id: user.id,
      metadata: {
        coach_id: user.id,
        plan,
        billing_scope: billingScope,
        gym_id: gymId ?? '',
        interval,
      },
      subscription_data: {
        metadata: {
          coach_id: user.id,
          plan,
          billing_scope: billingScope,
          gym_id: gymId ?? '',
          interval,
        },
      },
      allow_promotion_codes: true,
    })

    if (!session.url) {
      return { success: false, error: 'Could not start checkout.' }
    }

    return { success: true, url: session.url }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not start checkout.'
    return { success: false, error: message }
  }
}

export type PortalResult =
  | { success: true; url: string }
  | { success: false; error: string }

export async function createStripePortalSession(): Promise<PortalResult> {
  if (!isStripeConfigured()) {
    return {
      success: false,
      error: 'Stripe billing is not configured yet.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return { success: false, error: 'Only coach accounts can manage billing.' }
  }

  if (!profile?.stripe_customer_id) {
    return {
      success: false,
      error: 'No billing account found. Subscribe to a plan first.',
    }
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getStripeSuccessUrl().replace('?checkout=success#billing', '#billing')}`,
    })

    return { success: true, url: session.url }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not open billing portal.'
    return { success: false, error: message }
  }
}

export function canCheckoutPlan(
  currentPlan: SubscriptionPlan,
  targetPlan: SubscriptionPlan
): boolean {
  if (targetPlan === 'starter') return false
  if (currentPlan === targetPlan) return false
  return true
}
