import { toDateKey } from '@/lib/calendar'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildWhoopDailyMetrics,
  fetchWhoopCycles,
  fetchWhoopRecoveries,
  fetchWhoopSleeps,
} from '@/lib/whoop/api'
import { getValidWhoopAccessToken } from '@/lib/whoop/token-store'
import type { ClientWearableConnection } from 'app/types/database'

const SYNC_LOOKBACK_DAYS = 14

function getSyncStartIso(): string {
  const start = new Date()
  start.setDate(start.getDate() - SYNC_LOOKBACK_DAYS)
  return start.toISOString()
}

export async function syncWhoopConnection(
  connection: Pick<
    ClientWearableConnection,
    'id' | 'client_id' | 'coach_id' | 'provider' | 'status'
  >
): Promise<{ syncedDays: number }> {
  if (connection.provider !== 'whoop') {
    throw new Error('Connection is not a Whoop integration.')
  }
  if (connection.status !== 'connected' && connection.status !== 'pending') {
    throw new Error('Whoop connection is not active.')
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const accessToken = await getValidWhoopAccessToken(connection.id)
  const start = getSyncStartIso()

  const [recoveries, cycles, sleeps] = await Promise.all([
    fetchWhoopRecoveries(accessToken, start),
    fetchWhoopCycles(accessToken, start),
    fetchWhoopSleeps(accessToken, start),
  ])

  const drafts = buildWhoopDailyMetrics({ recoveries, cycles, sleeps })
  const syncedAt = new Date().toISOString()

  for (const draft of drafts) {
    const { error } = await admin.from('client_wearable_daily_metrics').upsert(
      {
        client_id: connection.client_id,
        coach_id: connection.coach_id,
        connection_id: connection.id,
        provider: 'whoop',
        metric_date: draft.metricDate,
        steps: null,
        sleep_hours: draft.sleepHours,
        sleep_score: draft.sleepScore,
        hrv_ms: draft.hrvMs,
        resting_hr_bpm: draft.restingHrBpm,
        recovery_score: draft.recoveryScore,
        strain_score: draft.strainScore,
        calories_kcal: draft.caloriesKcal,
      },
      { onConflict: 'client_id,provider,metric_date' }
    )

    if (error) {
      throw new Error(error.message)
    }
  }

  const connectionUpdate: {
    status: 'connected'
    last_synced_at: string
    sync_error: null
    connected_at?: string
  } = {
    status: 'connected',
    last_synced_at: syncedAt,
    sync_error: null,
  }

  if (connection.status === 'pending') {
    connectionUpdate.connected_at = syncedAt
  }

  const { error: connectionError } = await admin
    .from('client_wearable_connections')
    .update(connectionUpdate)
    .eq('id', connection.id)

  if (connectionError) {
    throw new Error(connectionError.message)
  }

  return { syncedDays: drafts.length }
}

export async function markWhoopConnectionError(
  connectionId: string,
  message: string
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  await admin
    .from('client_wearable_connections')
    .update({
      status: 'error',
      sync_error: message.slice(0, 500),
    })
    .eq('id', connectionId)
}

export function shouldSyncWhoopConnection(
  lastSyncedAt: string | null | undefined,
  maxAgeMinutes = 60
): boolean {
  if (!lastSyncedAt) return true
  const lastSyncMs = new Date(lastSyncedAt).getTime()
  if (!Number.isFinite(lastSyncMs)) return true
  return Date.now() - lastSyncMs > maxAgeMinutes * 60_000
}

export function getTodayMetricDate(): string {
  return toDateKey(new Date())
}
