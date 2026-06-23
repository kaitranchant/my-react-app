import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  calculateWeightFromPercent,
  getSuggestedLogValuesForSet,
  parseWeightPercent,
  previousSessionMetTargets,
  suggestProgressiveLoadWeight,
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
    reps: '5',
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
      instructions: null,
    },
    ...overrides,
  }
}

describe('parseWeightPercent', () => {
  it('parses single values with or without a percent sign', () => {
    assert.equal(parseWeightPercent('75'), 75)
    assert.equal(parseWeightPercent('75%'), 75)
  })

  it('uses the midpoint for ranges', () => {
    assert.equal(parseWeightPercent('70-80'), 75)
  })
})

describe('calculateWeightFromPercent', () => {
  it('rounds to the nearest 2.5 lb increment', () => {
    assert.equal(calculateWeightFromPercent(300, 75), 225)
    assert.equal(calculateWeightFromPercent(247, 75), 185)
  })
})

describe('progressive overload suggestions', () => {
  it('detects when the previous session met all rep targets', () => {
    const exercise = baseExercise({ sets: '3', reps: '5' })
    const previousSets = {
      1: { weight: 185, reps: 5 },
      2: { weight: 185, reps: 5 },
      3: { weight: 185, reps: 6 },
    }

    assert.equal(previousSessionMetTargets(exercise, previousSets), true)
    assert.equal(
      previousSessionMetTargets(exercise, {
        1: { weight: 185, reps: 5 },
        2: { weight: 185, reps: 4 },
      }),
      false
    )
  })

  it('suggests a 2.5 lb increase when auto progress is enabled', () => {
    const exercise = baseExercise({
      tracking_options: {
        ...baseExercise().tracking_options,
        autoProgressLoad: true,
      },
    })

    assert.equal(
      suggestProgressiveLoadWeight(exercise, {
        1: { weight: 185, reps: 5 },
        2: { weight: 185, reps: 5 },
        3: { weight: 185, reps: 5 },
      }),
      187.5
    )
  })

  it('prefers percent-of-1RM over progressive overload', () => {
    const exercise = baseExercise({
      weight_percent: '75',
      tracking_options: {
        ...baseExercise().tracking_options,
        autoProgressLoad: true,
      },
    })

    const suggested = getSuggestedLogValuesForSet(
      exercise,
      1,
      {
        1: { weight: 185, reps: 5 },
        2: { weight: 185, reps: 5 },
        3: { weight: 185, reps: 5 },
      },
      { personalBest: { e1rm: 247, topSetWeight: 225, topSetReps: 3 } }
    )

    assert.equal(suggested.weight, '185')
    assert.equal(suggested.reps, '5')
  })
})
