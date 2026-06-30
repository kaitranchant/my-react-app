import Stripe from 'stripe'

import { getAppBaseUrl } from '@/lib/email/config'

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export type StripeKeyMode = 'test' | 'live'

export function getStripeKeyMode(): StripeKeyMode | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) return null
  if (secretKey.startsWith('sk_test_')) return 'test'
  if (secretKey.startsWith('sk_live_')) return 'live'
  return null
}

export function getLiveModeHttpsRedirectError(baseUrl: string): string | null {
  if (getStripeKeyMode() !== 'live') return null
  if (baseUrl.startsWith('https://')) return null
  return 'Live Stripe keys require HTTPS redirect URLs. Set APP_URL to your https:// production URL (or an ngrok tunnel), restart the dev server, then try again.'
}

export function assertStripeLiveModeRedirects(baseUrl: string): void {
  const error = getLiveModeHttpsRedirectError(baseUrl)
  if (error) {
    throw new Error(error)
  }
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
