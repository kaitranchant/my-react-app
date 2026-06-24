import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildSetDrafts,
  getSuggestedLogValuesForSet,
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
      weight_percent: '75',
      tracking_options: {
        ...baseExercise().tracking_options,
        autoProgressLoad: true,
      },
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
      { personalBest: { e1rm: 300, topSetWeight: 225, topSetReps: 3 } }
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
