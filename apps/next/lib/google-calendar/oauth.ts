import {
  getGoogleCalendarClientId,
  getGoogleCalendarClientSecret,
  getGoogleCalendarRedirectUri,
  getGoogleCalendarScopeString,
  GOOGLE_CALENDAR_AUTH_URL,
  GOOGLE_CALENDAR_TOKEN_URL,
} from '@/lib/google-calendar/config'

export type GoogleCalendarOAuthState = {
  state: string
  coachId: string
}

export type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
}

function encodeFormBody(values: Record<string, string>): string {
  return new URLSearchParams(values).toString()
}

async function parseTokenResponse(response: Response): Promise<GoogleTokenResponse> {
  const body = (await response.json().catch(() => null)) as
    | GoogleTokenResponse
    | { error?: string; error_description?: string }
    | null

  if (!response.ok || !body || !('access_token' in body)) {
    const message =
      body && 'error_description' in body && body.error_description
        ? body.error_description
        : body && 'error' in body && body.error
          ? body.error
          : `Google token exchange failed (${response.status})`
    throw new Error(message)
  }

  return body
}

export function createGoogleCalendarOAuthState(coachId: string): GoogleCalendarOAuthState {
  return {
    state: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    coachId,
  }
}

export function serializeGoogleCalendarOAuthState(
  state: GoogleCalendarOAuthState
): string {
  return JSON.stringify(state)
}

export function parseGoogleCalendarOAuthState(
  value: string | undefined
): GoogleCalendarOAuthState | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<GoogleCalendarOAuthState>
    if (typeof parsed.state === 'string' && typeof parsed.coachId === 'string') {
      return { state: parsed.state, coachId: parsed.coachId }
    }
  } catch {
    return null
  }

  return null
}

export function buildGoogleCalendarAuthorizationUrl(
  origin: string,
  oauthState: GoogleCalendarOAuthState
): string {
  const clientId = getGoogleCalendarClientId()
  if (!clientId) {
    throw new Error('Google Calendar is not configured.')
  }

  const url = new URL(GOOGLE_CALENDAR_AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getGoogleCalendarRedirectUri(origin))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', getGoogleCalendarScopeString())
  url.searchParams.set('state', oauthState.state)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  return url.toString()
}

export async function exchangeGoogleCalendarAuthorizationCode(
  code: string,
  origin: string
): Promise<GoogleTokenResponse> {
  const clientId = getGoogleCalendarClientId()
  const clientSecret = getGoogleCalendarClientSecret()
  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar is not configured.')
  }

  const response = await fetch(GOOGLE_CALENDAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeFormBody({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleCalendarRedirectUri(origin),
    }),
    cache: 'no-store',
  })

  return parseTokenResponse(response)
}

export async function refreshGoogleCalendarAccessToken(
  refreshToken: string
): Promise<GoogleTokenResponse> {
  const clientId = getGoogleCalendarClientId()
  const clientSecret = getGoogleCalendarClientSecret()
  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar is not configured.')
  }

  const response = await fetch(GOOGLE_CALENDAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeFormBody({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: 'no-store',
  })

  return parseTokenResponse(response)
}

export function tokenResponseToGoogleTokens(response: GoogleTokenResponse): {
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope: string | null
} {
  if (!response.refresh_token) {
    throw new Error('Google did not return a refresh token.')
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: new Date(Date.now() + response.expires_in * 1000).toISOString(),
    scope: response.scope ?? null,
  }
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  const { GOOGLE_CALENDAR_USERINFO_URL } = await import('@/lib/google-calendar/config')
  const response = await fetch(GOOGLE_CALENDAR_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Could not load Google account email.')
  }

  const body = (await response.json()) as { email?: string }
  if (!body.email) {
    throw new Error('Google account email not available.')
  }

  return body.email
}
