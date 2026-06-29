'use server'

import {
  createStripeCheckoutSession,
  createStripePortalSession,
  type CheckoutInput,
  type CheckoutResult,
  type PortalResult,
} from '@/lib/stripe/checkout'

export async function startStripeCheckout(
  input: CheckoutInput
): Promise<CheckoutResult> {
  return createStripeCheckoutSession(input)
}

export async function openStripeBillingPortal(): Promise<PortalResult> {
  return createStripePortalSession()
}
