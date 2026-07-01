import { createAdminClient } from '@/lib/supabase/admin'
import {
  refreshGoogleCalendarAccessToken,
  tokenResponseToGoogleTokens,
  type GoogleTokenResponse,
} from '@/lib/google-calendar/oauth'

export type GoogleCalendarConnectionTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope: string | null
}

type StoredGoogleCalendarTokens = GoogleCalendarConnectionTokens & {
  connectionId: string
}

const REFRESH_BUFFER_MS = 60_000

export async function saveGoogleCalendarTokens(
  connectionId: string,
  tokens: GoogleCalendarConnectionTokens,
  options?: { preserveRefreshToken?: boolean }
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  let refreshToken = tokens.refreshToken
  if (options?.preserveRefreshToken) {
    const existing = await getGoogleCalendarTokens(connectionId)
    if (existing?.refreshToken) {
      refreshToken = existing.refreshToken
    }
  }

  const { error } = await admin.from('coach_google_calendar_secrets').upsert(
    {
      connection_id: connectionId,
      access_token: tokens.accessToken,
      refresh_token: refreshToken,
      expires_at: tokens.expiresAt,
      scope: tokens.scope,
    },
    { onConflict: 'connection_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteGoogleCalendarTokens(
  connectionId: string
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  await admin
    .from('coach_google_calendar_secrets')
    .delete()
    .eq('connection_id', connectionId)
}

export async function getGoogleCalendarTokens(
  connectionId: string
): Promise<StoredGoogleCalendarTokens | null> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { data, error } = await admin
    .from('coach_google_calendar_secrets')
    .select('connection_id, access_token, refresh_token, expires_at, scope')
    .eq('connection_id', connectionId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) return null

  return {
    connectionId: data.connection_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    scope: data.scope,
  }
}

function isTokenExpired(expiresAt: string): boolean {
  return Date.now() + REFRESH_BUFFER_MS >= new Date(expiresAt).getTime()
}

export async function getValidGoogleCalendarAccessToken(
  connectionId: string
): Promise<string> {
  const stored = await getGoogleCalendarTokens(connectionId)
  if (!stored) {
    throw new Error('Google Calendar tokens not found.')
  }

  if (!isTokenExpired(stored.expiresAt)) {
    return stored.accessToken
  }

  const refreshed = await refreshGoogleCalendarAccessToken(stored.refreshToken)
  const tokens = tokensFromRefreshResponse(refreshed, stored.refreshToken)
  await saveGoogleCalendarTokens(connectionId, tokens, {
    preserveRefreshToken: !refreshed.refresh_token,
  })
  return tokens.accessToken
}

function tokensFromRefreshResponse(
  response: GoogleTokenResponse,
  existingRefreshToken: string
): GoogleCalendarConnectionTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? existingRefreshToken,
    expiresAt: new Date(Date.now() + response.expires_in * 1000).toISOString(),
    scope: response.scope ?? null,
  }
}

export { tokenResponseToGoogleTokens }
