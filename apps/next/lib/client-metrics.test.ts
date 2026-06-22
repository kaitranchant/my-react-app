import assert from 'node:assert/strict'
import test from 'node:test'

import { toDateKey } from '@/lib/calendar'
import {
  getBlendedReadinessLevel,
  getCheckInConcernFlags,
  type ClientWorkoutActivity,
} from './client-metrics'
import type { ClientCheckIn } from 'app/types/database'

const todayKey = toDateKey(new Date())

function makeWorkout(
  overrides: Partial<ClientWorkoutActivity> = {}
): ClientWorkoutActivity {
  return {
    id: overrides.id ?? 'workout-id',
    name: overrides.name ?? 'Session',
    status: overrides.status ?? 'completed',
    scheduled_date: overrides.scheduled_date ?? todayKey,
    started_at: overrides.started_at ?? null,
    completed_at: overrides.completed_at ?? `${todayKey}T12:00:00Z`,
    updated_at: overrides.updated_at ?? `${todayKey}T12:00:00Z`,
  }
}

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
    created_at: overrides.created_at ?? '2026-06-18T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-06-18T00:00:00Z',
  }
}

test('getCheckInConcernFlags captures low sleep, soreness, and pain', () => {
  const flags = getCheckInConcernFlags(
    makeCheckIn({
      check_in_date: todayKey,
      sleep_hours: 5,
      soreness_level: 4,
      has_pain: true,
    })
  )

  assert.deepEqual(flags, ['Pain flagged', 'Low sleep', 'High soreness'])
})

test('getBlendedReadinessLevel downgrades active clients with pain flags', () => {
  const result = getBlendedReadinessLevel(
    [makeWorkout()],
    makeCheckIn({
      check_in_date: todayKey,
      has_pain: true,
      energy_level: 4,
      soreness_level: 2,
    })
  )

  assert.equal(result.label, 'Low')
  assert.equal(result.variant, 'danger')
  assert.ok(result.flags.includes('Pain flagged'))
})

test('getBlendedReadinessLevel downgrades one level for a single concern flag', () => {
  const result = getBlendedReadinessLevel(
    [makeWorkout()],
    makeCheckIn({
      check_in_date: todayKey,
      energy_level: 4,
      soreness_level: 4,
    })
  )

  assert.equal(result.label, 'Moderate')
  assert.equal(result.variant, 'warning')
})

test('getBlendedReadinessLevel falls back to check-in readiness without workouts', () => {
  const result = getBlendedReadinessLevel(
    [],
    makeCheckIn({
      check_in_date: todayKey,
      energy_level: 5,
      calm_level: 4,
      soreness_level: 1,
    })
  )

  assert.equal(result.label, 'High')
  assert.equal(result.variant, 'success')
})
