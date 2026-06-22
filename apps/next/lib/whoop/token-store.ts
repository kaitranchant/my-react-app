import { createAdminClient } from '@/lib/supabase/admin'
import {
  refreshWhoopAccessToken,
  tokenResponseToConnectionTokens,
} from '@/lib/whoop/oauth'
import type { WhoopConnectionTokens } from '@/lib/whoop/types'

type StoredWhoopTokens = WhoopConnectionTokens & {
  connectionId: string
}

const REFRESH_BUFFER_MS = 60_000

export async function saveWhoopConnectionTokens(
  connectionId: string,
  tokens: WhoopConnectionTokens
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { error } = await admin.from('client_wearable_connection_secrets').upsert(
    {
      connection_id: connectionId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
      scope: tokens.scope,
    },
    { onConflict: 'connection_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteWhoopConnectionTokens(
  connectionId: string
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  await admin
    .from('client_wearable_connection_secrets')
    .delete()
    .eq('connection_id', connectionId)
}

export async function getWhoopConnectionTokens(
  connectionId: string
): Promise<StoredWhoopTokens | null> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { data, error } = await admin
    .from('client_wearable_connection_secrets')
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
  const expiresMs = new Date(expiresAt).getTime()
  return Date.now() + REFRESH_BUFFER_MS >= expiresMs
}

export async function getValidWhoopAccessToken(
  connectionId: string
): Promise<string> {
  const stored = await getWhoopConnectionTokens(connectionId)
  if (!stored) {
    throw new Error('Whoop connection tokens not found.')
  }

  if (!isTokenExpired(stored.expiresAt)) {
    return stored.accessToken
  }

  const refreshed = await refreshWhoopAccessToken(stored.refreshToken)
  const tokens = tokenResponseToConnectionTokens(refreshed)
  await saveWhoopConnectionTokens(connectionId, tokens)
  return tokens.accessToken
}
