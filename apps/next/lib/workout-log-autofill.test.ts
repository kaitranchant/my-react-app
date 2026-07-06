import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildSetDrafts,
  getPrescribedDistanceMetersForSet,
  getPrescribedDurationSecondsForSet,
  getSuggestedLogValuesForSet,
  parseDistancePrescription,
  parseDurationPrescription,
  resolvePreviousSetLog,
} from './workout-log'
import type { ScheduledWorkoutExerciseWithDetails } from 'app/types/database'

function baseExercise(
  overrides: Partial<ScheduledWorkoutExerciseWithDetails> = {}
): ScheduledWorkoutExerciseWithDetails {
  return {
    id: 'exercise-row-1',
    scheduled_workout_id: 'workout-1',
    exercise_id: 'library-exercise-1',
    sort_order: 0,
    sets: '3',
    reps: '8',
    prescription: null,
    superset_group: null,
    exercise_block: null,
    workout_notes: null,
    client_notes: null,
    rep_mode: 'reps',
    each_side: false,
    tempo: null,
    rest_seconds: null,
    weight_percent: null,
    target_weight: null,
    rpe_target: null,
    tracking_options: {
      completionLift: false,
      bodyweight: false,
      coachCompletes: false,
      disablePrTracking: false,
      forcePrUpdate: false,
      trackBarSpeed: false,
      trackPeakPower: false,
      trackReps: true,
      trackVolume: true,
      autoProgressLoad: false,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    exercise: {
      id: 'library-exercise-1',
      name: 'Back Squat',
      muscle_group: 'Legs',
      equipment: 'Barbell',
      external_id: null,
      image_url: null,
      demo_video_path: null,
      instructions: null,
    },
    ...overrides,
  }
}

describe('resolvePreviousSetLog', () => {
  it('falls back to the nearest earlier set when the exact set is missing', () => {
    const previousSets = {
      1: { weight: 185, reps: 5 },
      2: { weight: 185, reps: 5 },
    }

    assert.deepEqual(resolvePreviousSetLog(previousSets, 3), {
      weight: 185,
      reps: 5,
    })
  })
})

describe('auto-fill from previous session', () => {
  it('prefers last-session weight and reps over prescribed reps', () => {
    const exercise = baseExercise({ reps: '8' })
    const previousSets = {
      1: { weight: 200, reps: 10 },
    }

    const suggested = getSuggestedLogValuesForSet(exercise, 1, previousSets)

    assert.equal(suggested.weight, '200')
    assert.equal(suggested.reps, '10')
  })

  it('uses percent-of-1RM only when there is no previous session', () => {
    const exercise = baseExercise({
      reps: '5',
      weight_percent: '75',
    })

    const suggested = getSuggestedLogValuesForSet(exercise, 1, {}, {
      personalBest: { e1rm: 300, topSetWeight: 275, topSetReps: 2 },
    })

    assert.equal(suggested.weight, '225')
    assert.equal(suggested.reps, '5')
  })

  it('prefers progressive overload over previous-session weight when enabled', () => {
    const exercise = baseExercise({
      reps: '5',
    })

    const previousSets = {
      1: { weight: 185, reps: 5 },
      2: { weight: 185, reps: 5 },
      3: { weight: 185, reps: 5 },
    }

    const suggested = getSuggestedLogValuesForSet(
      exercise,
      1,
      previousSets,
      {
        personalBest: { e1rm: 300, topSetWeight: 225, topSetReps: 3 },
        progressiveOverloadEnabled: true,
      }
    )

    assert.equal(suggested.weight, '187.5')
    assert.equal(suggested.reps, '5')
  })

  it('marks prefilled sets as predicted in buildSetDrafts', () => {
    const exercise = baseExercise({ sets: '2', reps: '8' })
    const drafts = buildSetDrafts(
      exercise,
      [],
      {
        1: { weight: 200, reps: 10 },
        2: { weight: 200, reps: 9 },
      },
      null
    )

    assert.equal(drafts[0]?.weight, '200')
    assert.equal(drafts[0]?.reps, '10')
    assert.equal(drafts[0]?.predicted, true)
    assert.equal(drafts[1]?.weight, '200')
    assert.equal(drafts[1]?.reps, '9')
    assert.equal(drafts[1]?.predicted, true)
  })
})

describe('time-based exercise autofill', () => {
  it('parses mm:ss duration prescriptions into seconds', () => {
    assert.equal(parseDurationPrescription('1:00'), '60')
    assert.equal(parseDurationPrescription('30s'), '30')
    assert.equal(parseDurationPrescription('45'), '45')
  })

  it('prefills duration from previous session duration_seconds', () => {
    const exercise = baseExercise({ rep_mode: 'time', reps: '1:00' })
    const suggested = getSuggestedLogValuesForSet(exercise, 1, {
      1: { weight: null, reps: null, durationSeconds: 55 },
    })

    assert.equal(suggested.durationSeconds, '55')
    assert.equal(suggested.reps, '')
  })

  it('falls back to legacy reps column for time exercises', () => {
    const exercise = baseExercise({ rep_mode: 'time', reps: '45' })
    const suggested = getSuggestedLogValuesForSet(exercise, 1, {
      1: { weight: null, reps: 45, durationSeconds: null },
    })

    assert.equal(suggested.durationSeconds, '45')
  })

  it('uses parsed prescription when no previous session exists', () => {
    const exercise = baseExercise({ rep_mode: 'time', reps: '1:30' })
    const suggested = getSuggestedLogValuesForSet(exercise, 1, {})

    assert.equal(suggested.durationSeconds, '90')
  })

  it('marks time-based prefilled sets as predicted in buildSetDrafts', () => {
    const exercise = baseExercise({ rep_mode: 'time', sets: '2', reps: '30' })
    const drafts = buildSetDrafts(
      exercise,
      [],
      {
        1: { weight: null, reps: null, durationSeconds: 32 },
        2: { weight: null, reps: null, durationSeconds: 30 },
      },
      null
    )

    assert.equal(drafts[0]?.durationSeconds, '32')
    assert.equal(drafts[0]?.predicted, true)
    assert.equal(drafts[1]?.durationSeconds, '30')
    assert.equal(drafts[1]?.predicted, true)
  })

  it('reads prescribed duration seconds per set from prescription', () => {
    const exercise = baseExercise({
      rep_mode: 'time',
      sets: '3',
      reps: '30,45,1:00',
    })

    assert.equal(getPrescribedDurationSecondsForSet(exercise, 1), 30)
    assert.equal(getPrescribedDurationSecondsForSet(exercise, 2), 45)
    assert.equal(getPrescribedDurationSecondsForSet(exercise, 3), 60)
    assert.equal(getPrescribedDurationSecondsForSet(exercise, 4), 60)
  })
})

describe('distance-based exercise autofill', () => {
  it('parses distance prescriptions into meters', () => {
    assert.equal(parseDistancePrescription('400m'), '400')
    assert.equal(parseDistancePrescription('5k'), '5000')
    assert.equal(parseDistancePrescription('1mi'), '1609')
    assert.equal(parseDistancePrescription('1.5km'), '1500')
  })

  it('prefills distance from previous session distance_meters', () => {
    const exercise = baseExercise({ rep_mode: 'distance', reps: '400m' })
    const suggested = getSuggestedLogValuesForSet(exercise, 1, {
      1: { weight: null, reps: null, distanceMeters: 425 },
    })

    assert.equal(suggested.distanceMeters, '425')
    assert.equal(suggested.reps, '')
  })

  it('uses parsed prescription when no previous session exists', () => {
    const exercise = baseExercise({ rep_mode: 'distance', reps: '5k' })
    const suggested = getSuggestedLogValuesForSet(exercise, 1, {})

    assert.equal(suggested.distanceMeters, '5000')
  })

  it('marks distance-based prefilled sets as predicted in buildSetDrafts', () => {
    const exercise = baseExercise({ rep_mode: 'distance', sets: '2', reps: '400m' })
    const drafts = buildSetDrafts(
      exercise,
      [],
      {
        1: { weight: null, reps: null, distanceMeters: 410 },
        2: { weight: null, reps: null, distanceMeters: 400 },
      },
      null
    )

    assert.equal(drafts[0]?.distanceMeters, '410')
    assert.equal(drafts[0]?.predicted, true)
    assert.equal(drafts[1]?.distanceMeters, '400')
    assert.equal(drafts[1]?.predicted, true)
  })

  it('reads prescribed distance meters per set from prescription', () => {
    const exercise = baseExercise({
      rep_mode: 'distance',
      sets: '2',
      reps: '400m,800m',
    })

    assert.equal(getPrescribedDistanceMetersForSet(exercise, 1), 400)
    assert.equal(getPrescribedDistanceMetersForSet(exercise, 2), 800)
  })
})
