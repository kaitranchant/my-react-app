import { createAdminClient } from '@/lib/supabase/admin'
import type { AppleHealthDailyMetricInput } from '@/lib/validations/apple-health'
import type { ClientWearableConnection } from 'app/types/database'

export type AppleHealthDailyMetricDraft = {
  metricDate: string
  steps: number | null
  sleepHours: number | null
  restingHrBpm: number | null
  hrvMs: number | null
}

export function normalizeAppleHealthMetrics(
  metrics: AppleHealthDailyMetricInput[]
): AppleHealthDailyMetricDraft[] {
  const byDate = new Map<string, AppleHealthDailyMetricDraft>()

  for (const metric of metrics) {
    const existing = byDate.get(metric.metricDate)
    const draft: AppleHealthDailyMetricDraft = {
      metricDate: metric.metricDate,
      steps: metric.steps ?? existing?.steps ?? null,
      sleepHours: metric.sleepHours ?? existing?.sleepHours ?? null,
      restingHrBpm: metric.restingHrBpm ?? existing?.restingHrBpm ?? null,
      hrvMs: metric.hrvMs ?? existing?.hrvMs ?? null,
    }
    byDate.set(metric.metricDate, draft)
  }

  return Array.from(byDate.values()).sort((a, b) =>
    a.metricDate.localeCompare(b.metricDate)
  )
}

export async function syncAppleHealthConnection(
  connection: Pick<
    ClientWearableConnection,
    'id' | 'client_id' | 'coach_id' | 'provider' | 'status'
  >,
  metrics: AppleHealthDailyMetricInput[]
): Promise<{ syncedDays: number }> {
  if (connection.provider !== 'apple_health') {
    throw new Error('Connection is not an Apple Health integration.')
  }
  if (connection.status === 'disconnected') {
    throw new Error('Apple Health connection is not active.')
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const drafts = normalizeAppleHealthMetrics(metrics)
  if (drafts.length === 0) {
    throw new Error('No Apple Health metrics to sync.')
  }

  const syncedAt = new Date().toISOString()

  for (const draft of drafts) {
    const { error } = await admin.from('client_wearable_daily_metrics').upsert(
      {
        client_id: connection.client_id,
        coach_id: connection.coach_id,
        connection_id: connection.id,
        provider: 'apple_health',
        metric_date: draft.metricDate,
        steps: draft.steps,
        sleep_hours: draft.sleepHours,
        sleep_score: null,
        hrv_ms: draft.hrvMs,
        resting_hr_bpm: draft.restingHrBpm,
        recovery_score: null,
        strain_score: null,
        calories_kcal: null,
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

export async function markAppleHealthConnectionError(
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
