'use server'

import { revalidatePath } from 'next/cache'

import {
  disconnectAppleHealthConnection,
  upsertAppleHealthConnection,
} from '@/lib/apple-health/connection'
import { requirePortalClientContext } from '@/lib/portal-client'
import { formatSupabaseError } from '@/lib/supabase/errors'
import { areWearablesLive } from '@/lib/wearables-feature'
import { APPLE_HEALTH_MOBILE_DEEP_LINK } from '@/lib/wearables'
import { disconnectWhoopConnection } from '@/lib/whoop/connection'
import {
  shouldSyncWhoopConnection,
  syncWhoopConnection,
} from '@/lib/whoop/sync'
import { isWhoopConfigured } from '@/lib/whoop/config'
import { wearableProviderSchema } from '@/lib/validations/wearable'
import type { ClientWearableConnection, WearableProvider } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

const WEARABLES_DISABLED_ERROR =
  'Wearable connections are not available yet. Check back soon.'

function wearablesDisabledResult(): ActionResult {
  return { success: false, error: WEARABLES_DISABLED_ERROR }
}

function revalidateWearablePaths(clientId: string) {
  revalidatePath('/portal/wearables')
  revalidatePath('/wearables')
  revalidatePath(`/clients/${clientId}`)
}

export async function listClientWearableConnections(): Promise<
  ClientWearableConnection[]
> {
  if (!areWearablesLive()) {
    return []
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return []
  }

  const { supabase, client } = ctx

  async function fetchConnections() {
    const { data } = await supabase
      .from('client_wearable_connections')
      .select('*')
      .eq('client_id', client.id)
      .order('updated_at', { ascending: false })

    return (data ?? []) as ClientWearableConnection[]
  }

  let connections = await fetchConnections()
  const whoopConnection = connections.find(
    (connection) =>
      connection.provider === 'whoop' && connection.status === 'connected'
  )

  if (
    whoopConnection &&
    isWhoopConfigured() &&
    shouldSyncWhoopConnection(whoopConnection.last_synced_at)
  ) {
    try {
      await syncWhoopConnection(whoopConnection)
      connections = await fetchConnections()
      revalidateWearablePaths(client.id)
    } catch {
      // Keep the page usable if a background refresh fails.
    }
  }

  return connections
}

export async function requestWearableConnection(
  provider: WearableProvider
): Promise<ActionResult & { redirectUrl?: string; mobileDeepLink?: string }> {
  if (!areWearablesLive()) {
    return wearablesDisabledResult()
  }

  const parsed = wearableProviderSchema.safeParse(provider)
  if (!parsed.success) {
    return { success: false, error: 'Unsupported wearable provider.' }
  }

  if (parsed.data === 'whoop') {
    if (!isWhoopConfigured()) {
      return {
        success: false,
        error: 'Whoop is not configured yet. Ask your coach to add WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET.',
      }
    }

    return { success: true, redirectUrl: '/api/wearables/whoop/connect' }
  }

  if (parsed.data === 'apple_health') {
    const ctx = await requirePortalClientContext()
    if ('error' in ctx) {
      return { success: false, error: ctx.error }
    }

    const { data: existing } = await ctx.supabase
      .from('client_wearable_connections')
      .select('id, status')
      .eq('client_id', ctx.client.id)
      .eq('provider', 'apple_health')
      .maybeSingle()

    if (existing?.status === 'connected') {
      return {
        success: false,
        error: 'Apple Health is already connected.',
      }
    }

    try {
      if (existing?.status !== 'pending') {
        await upsertAppleHealthConnection({
          clientId: ctx.client.id,
          coachId: ctx.client.coach_id,
        })
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Could not prepare Apple Health connection.',
      }
    }

    revalidateWearablePaths(ctx.client.id)
    return { success: true, mobileDeepLink: APPLE_HEALTH_MOBILE_DEEP_LINK }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: existing } = await ctx.supabase
    .from('client_wearable_connections')
    .select('id, status')
    .eq('client_id', ctx.client.id)
    .eq('provider', parsed.data)
    .maybeSingle()

  if (existing?.status === 'connected' || existing?.status === 'pending') {
    return {
      success: false,
      error: 'This device is already connected or waiting to sync.',
    }
  }

  const payload = {
    client_id: ctx.client.id,
    coach_id: ctx.client.coach_id,
    provider: parsed.data,
    status: 'pending' as const,
    sync_error: null,
    connected_at: null,
    last_synced_at: null,
  }

  const query = existing?.id
    ? ctx.supabase
        .from('client_wearable_connections')
        .update(payload)
        .eq('id', existing.id)
    : ctx.supabase.from('client_wearable_connections').insert(payload)

  const { error } = await query
  if (error) {
    return { success: false, error: formatSupabaseError(error) }
  }

  revalidateWearablePaths(ctx.client.id)
  return { success: true }
}

export async function disconnectWearableConnection(
  provider: WearableProvider
): Promise<ActionResult> {
  if (!areWearablesLive()) {
    return wearablesDisabledResult()
  }

  const parsed = wearableProviderSchema.safeParse(provider)
  if (!parsed.success) {
    return { success: false, error: 'Unsupported wearable provider.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: connection } = await ctx.supabase
    .from('client_wearable_connections')
    .select('id, client_id, provider, status')
    .eq('client_id', ctx.client.id)
    .eq('provider', parsed.data)
    .maybeSingle()

  if (!connection) {
    return { success: true }
  }

  try {
    if (connection.provider === 'whoop') {
      await disconnectWhoopConnection(connection)
    } else if (connection.provider === 'apple_health') {
      await disconnectAppleHealthConnection(connection)
    } else {
      const { error } = await ctx.supabase
        .from('client_wearable_connections')
        .update({
          status: 'disconnected',
          sync_error: null,
          last_synced_at: null,
          connected_at: null,
        })
        .eq('id', connection.id)

      if (error) {
        return { success: false, error: formatSupabaseError(error) }
      }
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to disconnect device.',
    }
  }

  revalidateWearablePaths(ctx.client.id)
  return { success: true }
}

export async function syncWhoopConnectionNow(): Promise<ActionResult> {
  if (!areWearablesLive()) {
    return wearablesDisabledResult()
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  if (!isWhoopConfigured()) {
    return {
      success: false,
      error: 'Whoop is not configured on this server.',
    }
  }

  const { data: connection } = await ctx.supabase
    .from('client_wearable_connections')
    .select('*')
    .eq('client_id', ctx.client.id)
    .eq('provider', 'whoop')
    .maybeSingle()

  if (!connection || connection.status === 'disconnected') {
    return { success: false, error: 'Connect Whoop before syncing.' }
  }

  try {
    await syncWhoopConnection(connection)
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Whoop sync failed.',
    }
  }

  revalidateWearablePaths(ctx.client.id)
  return { success: true }
}
