import { test, expect } from 'vitest'

import { buildClientWearableRosterRow } from '@/lib/wearable-queries'
import type {
  ClientWearableConnection,
  ClientWearableDailyMetric,
} from 'app/types/database'

const client = {
  id: 'client-1',
  full_name: 'Alex Rivera',
  avatar_url: null,
}

test('buildClientWearableRosterRow prefers connected provider and latest metric', () => {
  const connections: ClientWearableConnection[] = [
    {
      id: 'conn-1',
      client_id: client.id,
      coach_id: 'coach-1',
      provider: 'garmin',
      status: 'pending',
      external_user_id: null,
      display_name: null,
      last_synced_at: null,
      sync_error: null,
      metadata: {},
      connected_at: null,
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'conn-2',
      client_id: client.id,
      coach_id: 'coach-1',
      provider: 'whoop',
      status: 'connected',
      external_user_id: 'whoop-user',
      display_name: 'Whoop 4.0',
      last_synced_at: '2026-06-20T08:00:00.000Z',
      sync_error: null,
      metadata: {},
      connected_at: '2026-06-10T08:00:00.000Z',
      created_at: '2026-06-10T00:00:00.000Z',
      updated_at: '2026-06-20T08:00:00.000Z',
    },
  ]

  const metrics: ClientWearableDailyMetric[] = [
    {
      id: 'metric-1',
      client_id: client.id,
      coach_id: 'coach-1',
      connection_id: 'conn-2',
      provider: 'whoop',
      metric_date: '2026-06-19',
      steps: 8420,
      sleep_hours: 7.5,
      sleep_score: 82,
      hrv_ms: 68,
      resting_hr_bpm: 52,
      recovery_score: 71,
      strain_score: 12.4,
      calories_kcal: 2450,
      created_at: '2026-06-20T00:00:00.000Z',
      updated_at: '2026-06-20T00:00:00.000Z',
    },
    {
      id: 'metric-2',
      client_id: client.id,
      coach_id: 'coach-1',
      connection_id: 'conn-1',
      provider: 'garmin',
      metric_date: '2026-06-20',
      steps: 12000,
      sleep_hours: 6.8,
      sleep_score: null,
      hrv_ms: null,
      resting_hr_bpm: null,
      recovery_score: null,
      strain_score: null,
      calories_kcal: null,
      created_at: '2026-06-20T00:00:00.000Z',
      updated_at: '2026-06-20T00:00:00.000Z',
    },
  ]

  const row = buildClientWearableRosterRow(client, connections, metrics)

  expect(row.provider).toBe('whoop')
  expect(row.providerLabel).toBe('Whoop')
  expect(row.lastSyncedAt).toBe('2026-06-20T08:00:00.000Z')
  expect(row.metricDate).toBe('2026-06-19')
  expect(row.recoveryScore).toBe(71)
  expect(row.steps).toBe(8420)
})

test('buildClientWearableRosterRow returns empty metrics when no connection', () => {
  const row = buildClientWearableRosterRow(client, [], [])

  expect(row.provider).toBeNull()
  expect(row.connectionStatus).toBeNull()
  expect(row.steps).toBeNull()
})
