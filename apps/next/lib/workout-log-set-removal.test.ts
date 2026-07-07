import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createSetDraftId,
  removeSetDraft,
  type WorkoutLogSetDraft,
} from '@/lib/workout-log'
import type { ScheduledWorkoutExerciseWithDetails } from 'app/types/database'

const exercise = {
  id: 'exercise-row-1',
  sets: '4',
  reps: '8',
  prescription: null,
} as ScheduledWorkoutExerciseWithDetails

function makeSet(
  setNumber: number,
  weight: string,
  draftId = createSetDraftId()
): WorkoutLogSetDraft {
  return {
    draftId,
    setNumber,
    targetLabel: String(setNumber * 8),
    weight,
    reps: '8',
    durationSeconds: '',
    distanceMeters: '',
    barSpeed: '',
    peakPower: '',
    completed: false,
    predicted: false,
    notes: '',
  }
}

test('removeSetDraft removes only the targeted set and renumbers below', () => {
  const set1 = makeSet(1, '100')
  const set2 = makeSet(2, '110')
  const set3 = makeSet(3, '120')
  const set4 = makeSet(4, '130')

  const nextSets = removeSetDraft(exercise, [set1, set2, set3, set4], set2.draftId)

  assert.deepEqual(
    nextSets?.map((set) => ({
      draftId: set.draftId,
      setNumber: set.setNumber,
      weight: set.weight,
    })),
    [
      { draftId: set1.draftId, setNumber: 1, weight: '100' },
      { draftId: set3.draftId, setNumber: 2, weight: '120' },
      { draftId: set4.draftId, setNumber: 3, weight: '130' },
    ]
  )
})

test('removeSetDraft keeps later sets when deleting from an unsorted array', () => {
  const set1 = makeSet(1, '100')
  const set2 = makeSet(2, '110')
  const set3 = makeSet(3, '120')
  const set4 = makeSet(4, '130')

  const nextSets = removeSetDraft(
    exercise,
    [set4, set1, set2, set3],
    set2.draftId
  )

  assert.equal(nextSets?.length, 3)
  assert.deepEqual(
    nextSets?.map((set) => set.weight),
    ['100', '120', '130']
  )
})
