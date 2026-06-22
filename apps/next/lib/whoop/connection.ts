import { createAdminClient } from '@/lib/supabase/admin'
import { revokeWhoopAccess } from '@/lib/whoop/api'
import {
  deleteWhoopConnectionTokens,
  getWhoopConnectionTokens,
} from '@/lib/whoop/token-store'
import type { ClientWearableConnection } from 'app/types/database'

export async function disconnectWhoopConnection(
  connection: Pick<ClientWearableConnection, 'id' | 'client_id'>
): Promise<void> {
  const tokens = await getWhoopConnectionTokens(connection.id).catch(() => null)

  if (tokens?.accessToken) {
    try {
      await revokeWhoopAccess(tokens.accessToken)
    } catch {
      // Best-effort revoke — still clear local state if Whoop rejects the token.
    }
  }

  await deleteWhoopConnectionTokens(connection.id)

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { error } = await admin
    .from('client_wearable_connections')
    .update({
      status: 'disconnected',
      sync_error: null,
      last_synced_at: null,
      connected_at: null,
      external_user_id: null,
      display_name: null,
    })
    .eq('id', connection.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function upsertWhoopConnection(params: {
  clientId: string
  coachId: string
  externalUserId: string
  displayName: string | null
}): Promise<ClientWearableConnection> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const now = new Date().toISOString()
  const { data: existing } = await admin
    .from('client_wearable_connections')
    .select('*')
    .eq('client_id', params.clientId)
    .eq('provider', 'whoop')
    .maybeSingle()

  if (existing) {
    const { data, error } = await admin
      .from('client_wearable_connections')
      .update({
        coach_id: params.coachId,
        status: 'pending',
        external_user_id: params.externalUserId,
        display_name: params.displayName,
        sync_error: null,
        connected_at: now,
        last_synced_at: null,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update Whoop connection.')
    }

    return data
  }

  const { data, error } = await admin
    .from('client_wearable_connections')
    .insert({
      client_id: params.clientId,
      coach_id: params.coachId,
      provider: 'whoop',
      status: 'pending',
      external_user_id: params.externalUserId,
      display_name: params.displayName,
      connected_at: now,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create Whoop connection.')
  }

  return data
}
