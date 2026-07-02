import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderedIdsAfterInsert,
  computeInsertIndex,
  type OrderedExerciseRow,
} from './workout-exercise-order'

function row(
  id: string,
  sortOrder: number,
  block: OrderedExerciseRow['exercise_block'] = null,
  supersetGroup: string | null = null
): OrderedExerciseRow {
  return {
    id,
    sort_order: sortOrder,
    exercise_block: block,
    superset_group: supersetGroup,
  }
}

test('computeInsertIndex appends to unsectioned block by default', () => {
  const exercises = [row('a', 0), row('b', 1, null, 'A')]
  assert.equal(computeInsertIndex(exercises, null), 2)
})

test('computeInsertIndex inserts after existing superset peers', () => {
  const exercises = [
    row('squat', 0),
    row('bench', 1, null, 'A'),
    row('row', 2, null, 'A'),
    row('curl', 3),
  ]

  assert.equal(
    computeInsertIndex(exercises, null, { newSupersetGroup: 'A' }),
    3
  )
})

test('buildOrderedIdsAfterInsert groups new superset exercise with peers', () => {
  const exercises = [
    row('squat', 0),
    row('bench', 1, null, 'A'),
    row('row', 2, null, 'A'),
    row('curl', 3),
  ]

  const orderedIds = buildOrderedIdsAfterInsert(exercises, 'fly', null, {
    newSupersetGroup: 'A',
  })

  assert.deepEqual(orderedIds, ['squat', 'bench', 'row', 'fly', 'curl'])
})

test('buildOrderedIdsAfterInsert repositions exercise when joining a superset', () => {
  const exercises = [
    row('bench', 0, null, 'A'),
    row('row', 1, null, 'A'),
    row('curl', 2),
    row('fly', 3),
  ]

  const orderedIds = buildOrderedIdsAfterInsert(exercises, 'curl', null, {
    excludeId: 'curl',
    newSupersetGroup: 'A',
  })

  assert.deepEqual(orderedIds, ['bench', 'row', 'curl', 'fly'])
})
