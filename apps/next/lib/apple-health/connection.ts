import { createAdminClient } from '@/lib/supabase/admin'
import type { ClientWearableConnection } from 'app/types/database'

export async function upsertAppleHealthConnection(params: {
  clientId: string
  coachId: string
  displayName?: string | null
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
    .eq('provider', 'apple_health')
    .maybeSingle()

  if (existing) {
    const { data, error } = await admin
      .from('client_wearable_connections')
      .update({
        coach_id: params.coachId,
        status: 'pending',
        display_name: params.displayName ?? 'Apple Health',
        sync_error: null,
        connected_at: existing.connected_at ?? now,
        last_synced_at: null,
      })
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update Apple Health connection.')
    }

    return data
  }

  const { data, error } = await admin
    .from('client_wearable_connections')
    .insert({
      client_id: params.clientId,
      coach_id: params.coachId,
      provider: 'apple_health',
      status: 'pending',
      display_name: params.displayName ?? 'Apple Health',
      connected_at: now,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create Apple Health connection.')
  }

  return data
}

export async function disconnectAppleHealthConnection(
  connection: Pick<ClientWearableConnection, 'id'>
): Promise<void> {
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
