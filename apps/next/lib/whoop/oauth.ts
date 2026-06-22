import {
  getWhoopClientId,
  getWhoopClientSecret,
  getWhoopRedirectUri,
  getWhoopScopeString,
  WHOOP_TOKEN_URL,
} from '@/lib/whoop/config'
import type { WhoopTokenResponse } from '@/lib/whoop/types'

export type WhoopOAuthState = {
  state: string
  clientId: string
  coachId: string
}

function encodeFormBody(values: Record<string, string>): string {
  return new URLSearchParams(values).toString()
}

async function parseTokenResponse(response: Response): Promise<WhoopTokenResponse> {
  const body = (await response.json().catch(() => null)) as
    | WhoopTokenResponse
    | { error?: string; error_description?: string }
    | null

  if (!response.ok || !body || !('access_token' in body)) {
    const message =
      body && 'error_description' in body && body.error_description
        ? body.error_description
        : body && 'error' in body && body.error
          ? body.error
          : `Whoop token exchange failed (${response.status})`
    throw new Error(message)
  }

  return body
}

export function buildWhoopAuthorizationUrl(
  origin: string,
  oauthState: WhoopOAuthState
): string {
  const clientId = getWhoopClientId()
  if (!clientId) {
    throw new Error('Whoop is not configured.')
  }

  const url = new URL('https://api.prod.whoop.com/oauth/oauth2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', getWhoopRedirectUri(origin))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', getWhoopScopeString())
  url.searchParams.set('state', oauthState.state)
  return url.toString()
}

export async function exchangeWhoopAuthorizationCode(
  code: string,
  origin: string
): Promise<WhoopTokenResponse> {
  const clientId = getWhoopClientId()
  const clientSecret = getWhoopClientSecret()
  if (!clientId || !clientSecret) {
    throw new Error('Whoop is not configured.')
  }

  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeFormBody({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getWhoopRedirectUri(origin),
    }),
    cache: 'no-store',
  })

  return parseTokenResponse(response)
}

export async function refreshWhoopAccessToken(
  refreshToken: string
): Promise<WhoopTokenResponse> {
  const clientId = getWhoopClientId()
  const clientSecret = getWhoopClientSecret()
  if (!clientId || !clientSecret) {
    throw new Error('Whoop is not configured.')
  }

  const response = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeFormBody({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: getWhoopScopeString(),
    }),
    cache: 'no-store',
  })

  return parseTokenResponse(response)
}

export function createWhoopOAuthState(
  clientId: string,
  coachId: string
): WhoopOAuthState {
  return {
    state: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    clientId,
    coachId,
  }
}

export function serializeWhoopOAuthState(state: WhoopOAuthState): string {
  return JSON.stringify(state)
}

export function parseWhoopOAuthState(value: string | undefined): WhoopOAuthState | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<WhoopOAuthState>
    if (
      typeof parsed.state === 'string' &&
      typeof parsed.clientId === 'string' &&
      typeof parsed.coachId === 'string'
    ) {
      return {
        state: parsed.state,
        clientId: parsed.clientId,
        coachId: parsed.coachId,
      }
    }
  } catch {
    return null
  }

  return null
}

export function tokenResponseToConnectionTokens(
  response: WhoopTokenResponse
): {
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope: string | null
} {
  const expiresAt = new Date(Date.now() + response.expires_in * 1000).toISOString()
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt,
    scope: response.scope ?? null,
  }
}
