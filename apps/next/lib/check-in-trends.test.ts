import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCheckInTrendPoints,
  getVisibleCheckInTrendMetrics,
} from './check-in-trends'
import type { ClientCheckIn } from 'app/types/database'

function makeCheckIn(
  overrides: Partial<ClientCheckIn> & Pick<ClientCheckIn, 'check_in_date'>
): ClientCheckIn {
  return {
    id: overrides.id ?? 'check-in-id',
    client_id: overrides.client_id ?? 'client-id',
    coach_id: overrides.coach_id ?? 'coach-id',
    check_in_date: overrides.check_in_date,
    weight: overrides.weight ?? null,
    sleep_hours: overrides.sleep_hours ?? null,
    calm_level: overrides.calm_level ?? null,
    sleep_quality: overrides.sleep_quality ?? null,
    energy_level: overrides.energy_level ?? null,
    motivation_level: overrides.motivation_level ?? null,
    nutrition_adherence: overrides.nutrition_adherence ?? null,
    soreness_level: overrides.soreness_level ?? null,
    soreness_notes: overrides.soreness_notes ?? null,
    has_pain: overrides.has_pain ?? false,
    pain_notes: overrides.pain_notes ?? null,
    client_notes: overrides.client_notes ?? null,
    coach_notes: overrides.coach_notes ?? null,
    submitted_by: overrides.submitted_by ?? 'client',
    reviewed_at: overrides.reviewed_at ?? null,
    created_at: overrides.created_at ?? '2026-06-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-06-01T00:00:00Z',
  }
}

test('buildCheckInTrendPoints sorts chronologically and limits entries', () => {
  const points = buildCheckInTrendPoints(
    [
      makeCheckIn({ check_in_date: '2026-06-10', sleep_hours: 7 }),
      makeCheckIn({ check_in_date: '2026-06-08', sleep_hours: 6 }),
      makeCheckIn({ check_in_date: '2026-06-12', sleep_hours: 8 }),
    ],
    2
  )

  assert.equal(points.length, 2)
  assert.equal(points[0]?.dateKey, '2026-06-10')
  assert.equal(points[1]?.dateKey, '2026-06-12')
  assert.equal(points[1]?.sleepHours, 8)
})

test('getVisibleCheckInTrendMetrics hides empty series', () => {
  const metrics = getVisibleCheckInTrendMetrics([
    {
      dateKey: '2026-06-10',
      label: 'Jun 10',
      sleepHours: 7,
      energyLevel: null,
      sorenessLevel: null,
    },
  ])

  assert.deepEqual(
    metrics.map((metric) => metric.key),
    ['sleepHours']
  )
})
