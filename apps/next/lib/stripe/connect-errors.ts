import type { StripeKeyMode } from '@/lib/stripe/config'

export function getStripePlatformProfileUrl(
  mode: StripeKeyMode | null = 'live'
): string {
  if (mode === 'test') {
    return 'https://dashboard.stripe.com/test/settings/connect/platform-profile'
  }
  return 'https://dashboard.stripe.com/settings/connect/platform-profile'
}

/** @deprecated Use getStripePlatformProfileUrl(getStripeKeyMode()) */
export const STRIPE_PLATFORM_PROFILE_URL = getStripePlatformProfileUrl('live')

export function isStripePlatformProfileError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('managing losses') ||
    normalized.includes('platform-profile') ||
    normalized.includes('platform profile')
  )
}

export function isLiveModeHttpsRedirectError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('livemode requests must always be redirected via https') ||
    normalized.includes('must always be redirected via https')
  )
}

export function isConnectLoginBeforeOnboardingError(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('has not completed onboarding')
}

export const LIVE_HTTPS_REQUIRED_MESSAGE =
  'Live Stripe keys require HTTPS redirect URLs. Set APP_URL to your https:// production URL in .env.local, restart the dev server, then click Connect Stripe again.'

/** @deprecated Use LIVE_HTTPS_REQUIRED_MESSAGE */
export const LIVE_LOCALHOST_CONNECT_MESSAGE = LIVE_HTTPS_REQUIRED_MESSAGE

export function isLiveModeHttpsBlocked(
  keyMode: StripeKeyMode | null,
  baseUrl: string
): boolean {
  return keyMode === 'live' && !baseUrl.startsWith('https://')
}

/** @deprecated Use isLiveModeHttpsBlocked */
export function isLiveLocalhostConnectBlocked(
  keyMode: StripeKeyMode | null,
  baseUrl: string
): boolean {
  return isLiveModeHttpsBlocked(keyMode, baseUrl)
}

export function formatConnectOnboardingError(
  message: string,
  keyMode: StripeKeyMode | null = null
): string {
  if (
    isLiveModeHttpsRedirectError(message) ||
    isConnectLoginBeforeOnboardingError(message) ||
    message === LIVE_HTTPS_REQUIRED_MESSAGE ||
    message === LIVE_LOCALHOST_CONNECT_MESSAGE
  ) {
    return LIVE_HTTPS_REQUIRED_MESSAGE
  }

  if (isStripePlatformProfileError(message)) {
    const modeHint =
      keyMode === 'live'
        ? ' Your app is using live Stripe keys — complete this in live mode (turn off "Test mode" in the Stripe Dashboard).'
        : keyMode === 'test'
          ? ' Your app is using test Stripe keys — complete this in test/sandbox mode.'
          : ''
    return `Complete your Stripe Connect platform profile first (Settings → Connect → Platform profile), then try again.${modeHint}`
  }
  return message
}
