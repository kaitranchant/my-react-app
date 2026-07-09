import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { detectNewPrsForWorkout } from './workout-pr-detection'
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
      demo_video_url: null,
      instructions: null,
    },
    ...overrides,
  }
}

describe('detectNewPrsForWorkout', () => {
  it('detects a new e1RM from logged sets', () => {
    const exercise = baseExercise({ reps: '5' })
    const scheduledExerciseId = exercise.id

    const prs = detectNewPrsForWorkout(
      [exercise],
      {
        [scheduledExerciseId]: [
          { weight: 225, reps: 5, completed: true },
          { weight: 225, reps: 5, completed: true },
        ],
      },
      {
        [exercise.exercise_id]: {
          e1rm: 250,
          topSetWeight: 200,
          topSetReps: 5,
        },
      }
    )

    assert.ok(prs.length >= 1)
    assert.ok(prs.some((pr) => pr.recordType === 'e1rm'))
    const e1rmPr = prs.find((pr) => pr.recordType === 'e1rm')
    assert.ok((e1rmPr?.e1rm ?? 0) > 250)
  })

  it('returns no PRs when session does not beat historical bests', () => {
    const exercise = baseExercise({ reps: '8' })
    const scheduledExerciseId = exercise.id

    const prs = detectNewPrsForWorkout(
      [exercise],
      {
        [scheduledExerciseId]: [{ weight: 135, reps: 8, completed: true }],
      },
      {
        [exercise.exercise_id]: {
          e1rm: 400,
          topSetWeight: 315,
          topSetReps: 8,
        },
      }
    )

    assert.equal(prs.length, 0)
  })
})
