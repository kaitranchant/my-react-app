import { toDateKey } from '@/lib/calendar'
import { getWearableProviderLabel } from '@/lib/wearables'
import type { createClient } from '@/lib/supabase/server'
import type {
  Client,
  ClientWearableConnection,
  ClientWearableDailyMetric,
  WearableProvider,
} from 'app/types/database'

type AttendanceClient = Pick<Client, 'id' | 'full_name' | 'avatar_url'>

export type ClientWearableRosterRow = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  provider: WearableProvider | null
  providerLabel: string | null
  connectionStatus: ClientWearableConnection['status'] | null
  lastSyncedAt: string | null
  metricDate: string | null
  steps: number | null
  sleepHours: number | null
  sleepScore: number | null
  hrvMs: number | null
  restingHrBpm: number | null
  recoveryScore: number | null
  strainScore: number | null
  caloriesKcal: number | null
}

function pickPrimaryConnection(
  connections: ClientWearableConnection[]
): ClientWearableConnection | null {
  if (connections.length === 0) return null

  const rank = (status: ClientWearableConnection['status']) => {
    switch (status) {
      case 'connected':
        return 0
      case 'pending':
        return 1
      case 'error':
        return 2
      default:
        return 3
    }
  }

  return [...connections].sort((left, right) => {
    const statusDiff = rank(left.status) - rank(right.status)
    if (statusDiff !== 0) return statusDiff

    const leftSynced = left.last_synced_at
      ? new Date(left.last_synced_at).getTime()
      : 0
    const rightSynced = right.last_synced_at
      ? new Date(right.last_synced_at).getTime()
      : 0
    return rightSynced - leftSynced
  })[0]
}

function pickLatestMetric(
  metrics: ClientWearableDailyMetric[],
  provider: WearableProvider | null
): ClientWearableDailyMetric | null {
  const filtered = provider
    ? metrics.filter((row) => row.provider === provider)
    : metrics

  if (filtered.length === 0) return null

  return [...filtered].sort(
    (left, right) =>
      new Date(right.metric_date).getTime() -
      new Date(left.metric_date).getTime()
  )[0]
}

export function buildClientWearableRosterRow(
  client: AttendanceClient,
  connections: ClientWearableConnection[],
  metrics: ClientWearableDailyMetric[]
): ClientWearableRosterRow {
  const primaryConnection = pickPrimaryConnection(connections)
  const latestMetric = pickLatestMetric(
    metrics,
    primaryConnection?.provider ?? null
  )

  return {
    clientId: client.id,
    clientName: client.full_name?.trim() || 'Unnamed client',
    avatarUrl: client.avatar_url,
    provider: primaryConnection?.provider ?? null,
    providerLabel: primaryConnection
      ? getWearableProviderLabel(primaryConnection.provider)
      : null,
    connectionStatus: primaryConnection?.status ?? null,
    lastSyncedAt: primaryConnection?.last_synced_at ?? null,
    metricDate: latestMetric?.metric_date ?? null,
    steps: latestMetric?.steps ?? null,
    sleepHours: latestMetric?.sleep_hours ?? null,
    sleepScore: latestMetric?.sleep_score ?? null,
    hrvMs: latestMetric?.hrv_ms ?? null,
    restingHrBpm: latestMetric?.resting_hr_bpm ?? null,
    recoveryScore: latestMetric?.recovery_score ?? null,
    strainScore: latestMetric?.strain_score ?? null,
    caloriesKcal: latestMetric?.calories_kcal ?? null,
  }
}

export async function fetchCoachWearableRoster(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clients: AttendanceClient[]
): Promise<ClientWearableRosterRow[]> {
  if (clients.length === 0) return []

  const clientIds = clients.map((client) => client.id)
  const today = toDateKey(new Date())
  const lookbackStart = new Date(`${today}T12:00:00`)
  lookbackStart.setDate(lookbackStart.getDate() - 14)
  const lookbackDate = toDateKey(lookbackStart)

  const [{ data: connectionRows }, { data: metricRows }] = await Promise.all([
    supabase
      .from('client_wearable_connections')
      .select('*')
      .in('client_id', clientIds)
      .neq('status', 'disconnected'),
    supabase
      .from('client_wearable_daily_metrics')
      .select('*')
      .in('client_id', clientIds)
      .gte('metric_date', lookbackDate),
  ])

  const connectionsByClient = new Map<string, ClientWearableConnection[]>()
  for (const row of (connectionRows ?? []) as ClientWearableConnection[]) {
    const existing = connectionsByClient.get(row.client_id) ?? []
    existing.push(row)
    connectionsByClient.set(row.client_id, existing)
  }

  const metricsByClient = new Map<string, ClientWearableDailyMetric[]>()
  for (const row of (metricRows ?? []) as ClientWearableDailyMetric[]) {
    const existing = metricsByClient.get(row.client_id) ?? []
    existing.push(row)
    metricsByClient.set(row.client_id, existing)
  }

  return clients.map((client) =>
    buildClientWearableRosterRow(
      client,
      connectionsByClient.get(client.id) ?? [],
      metricsByClient.get(client.id) ?? []
    )
  )
}

export async function fetchClientWearableConnections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<ClientWearableConnection[]> {
  const { data } = await supabase
    .from('client_wearable_connections')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  return (data ?? []) as ClientWearableConnection[]
}
