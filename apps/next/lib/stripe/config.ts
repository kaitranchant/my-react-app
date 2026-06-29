import Stripe from 'stripe'

import { getAppBaseUrl } from '@/lib/email/config'

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function getStripeWebhookSecret(): string | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  return secret || null
}

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      typescript: true,
    })
  }

  return stripeClient
}

export function getStripeSuccessUrl(): string {
  return `${getAppBaseUrl()}/settings?checkout=success#billing`
}

export function getStripeCancelUrl(): string {
  return `${getAppBaseUrl()}/pricing?checkout=canceled`
}
