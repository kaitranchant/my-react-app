import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clusterExercisesBySuperset,
  getNextSupersetGroup,
  getSupersetPosition,
  getUsedSupersetGroups,
} from './superset-groups'

const exercises = [
  { id: '1', superset_group: null },
  { id: '2', superset_group: 'A' },
  { id: '3', superset_group: 'A' },
  { id: '4', superset_group: 'B' },
  { id: '5', superset_group: null },
] as const

test('getUsedSupersetGroups returns sorted unique letters', () => {
  assert.deepEqual(getUsedSupersetGroups([...exercises]), ['A', 'B'])
})

test('getNextSupersetGroup skips used letters', () => {
  assert.equal(getNextSupersetGroup([...exercises]), 'C')
  assert.equal(getNextSupersetGroup([]), 'A')
})

test('clusterExercisesBySuperset groups consecutive matching letters', () => {
  assert.deepEqual(clusterExercisesBySuperset([...exercises]), [
    { type: 'single', exercise: exercises[0] },
    { type: 'superset', group: 'A', exercises: [exercises[1], exercises[2]] },
    { type: 'superset', group: 'B', exercises: [exercises[3]] },
    { type: 'single', exercise: exercises[4] },
  ])
})

test('getSupersetPosition returns index within a multi-exercise group', () => {
  assert.deepEqual(getSupersetPosition(exercises[1], [...exercises]), {
    group: 'A',
    index: 1,
    total: 2,
  })
  assert.deepEqual(getSupersetPosition(exercises[2], [...exercises]), {
    group: 'A',
    index: 2,
    total: 2,
  })
  assert.equal(getSupersetPosition(exercises[3], [...exercises]), null)
  assert.equal(getSupersetPosition(exercises[0], [...exercises]), null)
})
