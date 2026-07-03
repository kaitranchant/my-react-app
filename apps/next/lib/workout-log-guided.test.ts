import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findResumeExerciseIndex,
  isExerciseFullyLogged,
} from './workout-log'
import type { WorkoutLogSetDraft } from './workout-log'

const completedSet: WorkoutLogSetDraft = {
  setNumber: 1,
  targetLabel: null,
  weight: '135',
  reps: '5',
  durationSeconds: '',
  distanceMeters: '',
  barSpeed: '',
  peakPower: '',
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
