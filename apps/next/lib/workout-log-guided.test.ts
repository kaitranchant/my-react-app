import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findResumeExerciseIndex,
  isExerciseFullyLogged,
  isGuidedWorkoutSessionEligible,
  shouldGuidedWorkoutAutoAdvance,
} from './workout-log'
import type { WorkoutLogSetDraft } from './workout-log'

const completedSet: WorkoutLogSetDraft = {
  draftId: 'set-draft-completed',
  setNumber: 1,
  targetLabel: null,
  weight: '135',
  reps: '5',
  durationSeconds: '',
  distanceMeters: '',
  barSpeed: '',
  peakPower: '',
  rpe: '',
  completed: true,
  predicted: false,
  notes: '',
}

const incompleteSet: WorkoutLogSetDraft = {
  ...completedSet,
  completed: false,
}

const exercises = [
  { id: 'ex-1' },
  { id: 'ex-2' },
  { id: 'ex-3' },
] as Parameters<typeof findResumeExerciseIndex>[0]

test('isExerciseFullyLogged requires every set to be completed', () => {
  assert.equal(isExerciseFullyLogged([]), false)
  assert.equal(isExerciseFullyLogged([incompleteSet]), false)
  assert.equal(isExerciseFullyLogged([completedSet]), true)
})

test('findResumeExerciseIndex returns first incomplete exercise', () => {
  const index = findResumeExerciseIndex(exercises, {
    'ex-1': [completedSet],
    'ex-2': [incompleteSet],
    'ex-3': [completedSet],
  })

  assert.equal(index, 1)
})

test('findResumeExerciseIndex returns last exercise when all are complete', () => {
  const index = findResumeExerciseIndex(exercises, {
    'ex-1': [completedSet],
    'ex-2': [completedSet],
    'ex-3': [completedSet],
  })

  assert.equal(index, 2)
})

test('shouldGuidedWorkoutAutoAdvance only when the active exercise just finished', () => {
  assert.equal(
    shouldGuidedWorkoutAutoAdvance({
      previousExerciseId: 'ex-2',
      previousWasFullyLogged: false,
      activeExerciseId: 'ex-2',
      isFullyLogged: true,
    }),
    true
  )

  assert.equal(
    shouldGuidedWorkoutAutoAdvance({
      previousExerciseId: 'ex-2',
      previousWasFullyLogged: false,
      activeExerciseId: 'ex-1',
      isFullyLogged: true,
    }),
    false
  )

  assert.equal(
    shouldGuidedWorkoutAutoAdvance({
      previousExerciseId: 'ex-1',
      previousWasFullyLogged: true,
      activeExerciseId: 'ex-1',
      isFullyLogged: true,
    }),
    false
  )
})

test('isGuidedWorkoutSessionEligible enables client page logging', () => {
  assert.equal(
    isGuidedWorkoutSessionEligible({
      isPage: true,
      readOnly: false,
      isCompleted: false,
      exerciseCount: 3,
      isClientPortal: true,
      preferMobileKeypad: false,
    }),
    true
  )
})

test('isGuidedWorkoutSessionEligible enables coach mobile page logging', () => {
  assert.equal(
    isGuidedWorkoutSessionEligible({
      isPage: true,
      readOnly: false,
      isCompleted: false,
      exerciseCount: 3,
      isClientPortal: false,
      preferMobileKeypad: true,
    }),
    true
  )
})

test('isGuidedWorkoutSessionEligible disables coach desktop modal logging', () => {
  assert.equal(
    isGuidedWorkoutSessionEligible({
      isPage: false,
      readOnly: false,
      isCompleted: false,
      exerciseCount: 3,
      isClientPortal: false,
      preferMobileKeypad: false,
    }),
    false
  )
})
