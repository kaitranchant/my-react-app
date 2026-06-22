export const WHOOP_API_BASE_URL = 'https://api.prod.whoop.com'
export const WHOOP_AUTH_URL = `${WHOOP_API_BASE_URL}/oauth/oauth2/auth`
export const WHOOP_TOKEN_URL = `${WHOOP_API_BASE_URL}/oauth/oauth2/token`

export const WHOOP_OAUTH_SCOPES = [
  'offline',
  'read:recovery',
  'read:sleep',
  'read:cycles',
  'read:profile',
] as const

export const WHOOP_OAUTH_COOKIE = 'whoop_oauth_state'
export const WHOOP_OAUTH_COOKIE_MAX_AGE_SECONDS = 600

export function getWhoopClientId(): string | null {
  return process.env.WHOOP_CLIENT_ID?.trim() || null
}

export function getWhoopClientSecret(): string | null {
  return process.env.WHOOP_CLIENT_SECRET?.trim() || null
}

export function isWhoopConfigured(): boolean {
  return Boolean(getWhoopClientId() && getWhoopClientSecret())
}

export function getWhoopRedirectUri(origin: string): string {
  const configured = process.env.WHOOP_REDIRECT_URI?.trim()
  if (configured) return configured
  return `${origin.replace(/\/$/, '')}/api/wearables/whoop/callback`
}

export function getWhoopScopeString(): string {
  return WHOOP_OAUTH_SCOPES.join(' ')
}
