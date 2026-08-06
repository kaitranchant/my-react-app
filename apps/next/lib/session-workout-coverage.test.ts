import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appointmentMissingWorkout,
  findSessionsMissingWorkouts,
  workoutCoverageKey,
} from './session-workout-coverage'

const timezone = 'America/New_York'

test('findSessionsMissingWorkouts flags scheduled sessions without a same-day workout', () => {
  const missing = findSessionsMissingWorkouts({
    appointments: [
      {
        id: 'a1',
        client_id: 'c1',
        starts_at: '2026-08-07T16:00:00.000Z', // Fri Aug 7 noon ET
        status: 'scheduled',
        client: { full_name: 'Sherry Boor', coaching_type: null },
      },
      {
        id: 'a2',
        client_id: 'c2',
        starts_at: '2026-08-07T19:30:00.000Z',
        status: 'scheduled',
        client: { full_name: 'Katie Johnston', coaching_type: null },
      },
    ],
    workoutCoverageKeys: new Set([workoutCoverageKey('c2', '2026-08-07')]),
    timezone,
    todayKey: '2026-08-06',
  })

  assert.equal(missing.length, 1)
  assert.equal(missing[0]?.clientName, 'Sherry Boor')
  assert.equal(missing[0]?.dateKey, '2026-08-07')
})

test('findSessionsMissingWorkouts ignores completed and past sessions', () => {
  const missing = findSessionsMissingWorkouts({
    appointments: [
      {
        id: 'past',
        client_id: 'c1',
        starts_at: '2026-08-05T16:00:00.000Z',
        status: 'scheduled',
        client: { full_name: 'Past Client', coaching_type: null },
      },
      {
        id: 'done',
        client_id: 'c1',
        starts_at: '2026-08-07T16:00:00.000Z',
        status: 'completed',
        client: { full_name: 'Done Client', coaching_type: null },
      },
    ],
    workoutCoverageKeys: new Set(),
    timezone,
    todayKey: '2026-08-06',
  })

  assert.equal(missing.length, 0)
})

test('appointmentMissingWorkout matches coverage keys', () => {
  assert.equal(
    appointmentMissingWorkout(
      {
        client_id: 'c1',
        starts_at: '2026-08-07T16:00:00.000Z',
        status: 'scheduled',
      },
      new Set(),
      timezone
    ),
    true
  )
  assert.equal(
    appointmentMissingWorkout(
      {
        client_id: 'c1',
        starts_at: '2026-08-07T16:00:00.000Z',
        status: 'scheduled',
      },
      new Set([workoutCoverageKey('c1', '2026-08-07')]),
      timezone
    ),
    false
  )
})
