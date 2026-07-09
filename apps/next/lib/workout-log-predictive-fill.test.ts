import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  applyExerciseSetChanges,
  buildSetDrafts,
  getLogFieldsForExercise,
  type WorkoutLogSetDraft,
} from './workout-log'
import type {
  ScheduledWorkoutExerciseWithDetails,
  WorkoutLogSet,
} from 'app/types/database'

function baseExercise(
  overrides: Partial<ScheduledWorkoutExerciseWithDetails> = {}
): ScheduledWorkoutExerciseWithDetails {
  return {
    id: 'exercise-row-1',
    scheduled_workout_id: 'workout-1',
    exercise_id: 'library-exercise-1',
    sort_order: 0,
    sets: '4',
    reps: '8',
    prescription: null,
    superset_group: null,
    exercise_block: null,
    workout_notes: null,
    client_notes: null,
    rep_mode: 'reps',
    each_side: false,
    tempo: null,
    rest_seconds: '90',
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
      name: 'Hip Thrust w/ Barbell',
      muscle_group: 'Legs',
      equipment: 'Barbell',
      external_id: null,
      image_url: null,
      demo_video_path: null,
      demo_video_url: null,
      instructions: null,
    },
    ...overrides,
  }
}

function emptySet(setNumber: number, overrides: Partial<WorkoutLogSetDraft> = {}) {
  return {
    draftId: `set-draft-${setNumber}`,
    setNumber,
    targetLabel: '8',
    weight: '',
    reps: '8',
    durationSeconds: '',
    distanceMeters: '',
    barSpeed: '',
    peakPower: '',
    completed: false,
    predicted: true,
    notes: '',
    ...overrides,
  }
}

describe('predictive fill propagation', () => {
  const fields = getLogFieldsForExercise(baseExercise())

  it('propagates weight to following sets as soon as weight is entered', () => {
    const sets = [
      emptySet(1, { reps: '', predicted: false }),
      emptySet(2),
      emptySet(3),
    ]

    const next = applyExerciseSetChanges(sets, 1, { weight: '50' }, fields)

    assert.equal(next[0]?.weight, '50')
    assert.equal(next[0]?.predicted, false)
    assert.equal(next[1]?.weight, '50')
    assert.equal(next[1]?.reps, '8')
    assert.equal(next[1]?.predicted, true)
    assert.equal(next[2]?.weight, '50')
    assert.equal(next[2]?.predicted, true)
  })

  it('propagates reps after they are entered on the source set', () => {
    const sets = [
      emptySet(1, { weight: '50', reps: '', predicted: false }),
      emptySet(2, { weight: '50', reps: '' }),
    ]

    const next = applyExerciseSetChanges(sets, 1, { reps: '8' }, fields)

    assert.equal(next[1]?.weight, '50')
    assert.equal(next[1]?.reps, '8')
    assert.equal(next[1]?.predicted, true)
  })

  it('propagates values when a set is confirmed with the checkmark', () => {
    const sets = [
      emptySet(1, { weight: '50', reps: '8', predicted: false }),
      emptySet(2, { reps: '', predicted: false }),
      emptySet(3, { reps: '', predicted: false }),
    ]

    const next = applyExerciseSetChanges(
      sets,
      1,
      { completed: true },
      fields
    )

    assert.equal(next[0]?.completed, true)
    assert.equal(next[1]?.weight, '50')
    assert.equal(next[1]?.reps, '8')
    assert.equal(next[1]?.predicted, true)
    assert.equal(next[2]?.weight, '50')
    assert.equal(next[2]?.predicted, true)
  })

  it('confirms predicted values when the checkmark is toggled', () => {
    const sets = [
      emptySet(1, { weight: '50', reps: '8', predicted: false, completed: true }),
      emptySet(2, { weight: '50', reps: '8', predicted: true }),
    ]

    const next = applyExerciseSetChanges(
      sets,
      2,
      { completed: true },
      fields
    )

    assert.equal(next[1]?.completed, true)
    assert.equal(next[1]?.predicted, false)
    assert.equal(next[1]?.weight, '50')
    assert.equal(next[1]?.reps, '8')
  })

  it('marks a completed set incomplete when weight or reps are edited', () => {
    const sets = [
      emptySet(1, {
        weight: '50',
        reps: '8',
        predicted: false,
        completed: true,
      }),
    ]

    const afterWeightEdit = applyExerciseSetChanges(
      sets,
      1,
      { weight: '55' },
      fields
    )
    assert.equal(afterWeightEdit[0]?.completed, false)
    assert.equal(afterWeightEdit[0]?.weight, '55')

    const afterRepsEdit = applyExerciseSetChanges(
      sets,
      1,
      { reps: '10' },
      fields
    )
    assert.equal(afterRepsEdit[0]?.completed, false)
    assert.equal(afterRepsEdit[0]?.reps, '10')
  })

  it('keeps propagating to sets reloaded from save without predicted flag', () => {
    const sets = [
      emptySet(1, { weight: '50', reps: '8', predicted: false }),
      emptySet(2, { weight: '50', reps: '8', predicted: false }),
      emptySet(3, { weight: '', reps: '', predicted: false }),
    ]

    const next = applyExerciseSetChanges(sets, 1, { weight: '55' }, fields)

    assert.equal(next[1]?.weight, '55')
    assert.equal(next[1]?.predicted, true)
    assert.equal(next[2]?.weight, '55')
    assert.equal(next[2]?.predicted, true)
  })

  it('restores predicted flags when reloading saved propagated sets', () => {
    const exercise = baseExercise()
    const logSets = [
      {
        id: 'log-1',
        scheduled_workout_id: 'workout-1',
        scheduled_exercise_id: exercise.id,
        set_number: 1,
        weight: 50,
        reps: 8,
        duration_seconds: null,
        bar_speed: null,
        peak_power: null,
        completed: false,
        notes: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'log-2',
        scheduled_workout_id: 'workout-1',
        scheduled_exercise_id: exercise.id,
        set_number: 2,
        weight: 50,
        reps: 8,
        duration_seconds: null,
        bar_speed: null,
        peak_power: null,
        completed: false,
        notes: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ] satisfies WorkoutLogSet[]

    const drafts = buildSetDrafts(exercise, logSets)

    assert.equal(drafts[0]?.predicted, false)
    assert.equal(drafts[1]?.predicted, true)
  })

  it('propagates duration to following sets for time-based exercises', () => {
    const exercise = baseExercise({ rep_mode: 'time', reps: '30' })
    const fields = getLogFieldsForExercise(exercise)
    const sets = [
      {
        ...emptySet(1, { reps: '', durationSeconds: '', predicted: false }),
        targetLabel: '30',
      },
      {
        ...emptySet(2, { reps: '', durationSeconds: '' }),
        targetLabel: '30',
      },
    ]

    const next = applyExerciseSetChanges(
      sets,
      1,
      { durationSeconds: '45' },
      fields
    )

    assert.equal(next[1]?.durationSeconds, '45')
    assert.equal(next[1]?.predicted, true)
  })
})
