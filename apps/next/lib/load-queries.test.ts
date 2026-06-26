import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSessionRowsFromWorkouts,
  buildTimeRowsFromLogData,
  buildVolumeRowsFromLogData,
  groupLogRowsByClientId,
  groupWorkoutsByClientId,
} from './load-queries'

const sharedLogRow = {
  weight: 100,
  reps: 10,
  duration_seconds: 60,
  completed: true,
  scheduled_workout_exercises: {
    exercise_id: 'ex-1',
    tracking_options: {
      trackReps: true,
      trackWeight: true,
      trackVolume: true,
      bodyweight: false,
      disablePrTracking: false,
      forcePrUpdate: false,
    },
  },
}

test('groupLogRowsByClientId preserves per-client aggregation parity', () => {
  const rows = [
    {
      ...sharedLogRow,
      client_scheduled_workouts: {
        id: 'w1',
        client_id: 'client-a',
        scheduled_date: '2026-06-01',
        completed_at: '2026-06-01T12:00:00.000Z',
        status: 'completed',
      },
    },
    {
      ...sharedLogRow,
      weight: 200,
      reps: 5,
      client_scheduled_workouts: {
        id: 'w2',
        client_id: 'client-b',
        scheduled_date: '2026-06-02',
        completed_at: '2026-06-02T12:00:00.000Z',
        status: 'completed',
      },
    },
    {
      ...sharedLogRow,
      weight: 150,
      reps: 8,
      client_scheduled_workouts: {
        id: 'w3',
        client_id: 'client-a',
        scheduled_date: '2026-06-03',
        completed_at: '2026-06-03T12:00:00.000Z',
        status: 'completed',
      },
    },
  ]

  const grouped = groupLogRowsByClientId(rows)
  const batchedVolume = [
    ...buildVolumeRowsFromLogData(grouped.get('client-a') ?? []),
    ...buildVolumeRowsFromLogData(grouped.get('client-b') ?? []),
  ]
  const sequentialVolume = [
    ...buildVolumeRowsFromLogData(rows.filter(
      (row) => row.client_scheduled_workouts.client_id === 'client-a'
    )),
    ...buildVolumeRowsFromLogData(rows.filter(
      (row) => row.client_scheduled_workouts.client_id === 'client-b'
    )),
  ]

  assert.deepEqual(
    batchedVolume.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    sequentialVolume.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  )

  const batchedTime = [
    ...buildTimeRowsFromLogData(grouped.get('client-a') ?? []),
    ...buildTimeRowsFromLogData(grouped.get('client-b') ?? []),
  ]
  const sequentialTime = [
    ...buildTimeRowsFromLogData(rows.filter(
      (row) => row.client_scheduled_workouts.client_id === 'client-a'
    )),
    ...buildTimeRowsFromLogData(rows.filter(
      (row) => row.client_scheduled_workouts.client_id === 'client-b'
    )),
  ]

  assert.deepEqual(
    batchedTime.sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    sequentialTime.sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  )
})

test('groupWorkoutsByClientId preserves session aggregation parity', () => {
  const workouts = [
    {
      id: 'w1',
      client_id: 'client-a',
      scheduled_date: '2026-06-01',
      status: 'completed',
      completed_at: '2026-06-01T12:00:00.000Z',
    },
    {
      id: 'w2',
      client_id: 'client-b',
      scheduled_date: '2026-06-02',
      status: 'completed',
      completed_at: '2026-06-02T12:00:00.000Z',
    },
  ]

  const grouped = groupWorkoutsByClientId(workouts)
  const batchedSessions = [
    ...buildSessionRowsFromWorkouts(grouped.get('client-a') ?? []),
    ...buildSessionRowsFromWorkouts(grouped.get('client-b') ?? []),
  ]
  const sequentialSessions = [
    ...buildSessionRowsFromWorkouts(
      workouts
        .filter((workout) => workout.client_id === 'client-a')
        .map(({ client_id: _clientId, ...workout }) => workout)
    ),
    ...buildSessionRowsFromWorkouts(
      workouts
        .filter((workout) => workout.client_id === 'client-b')
        .map(({ client_id: _clientId, ...workout }) => workout)
    ),
  ]

  assert.deepEqual(batchedSessions, sequentialSessions)
})
