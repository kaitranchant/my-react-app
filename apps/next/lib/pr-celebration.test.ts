import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPrCelebrationHeadline,
  buildPrShareText,
  formatPrAchievementLabel,
} from './pr-celebration'

test('buildPrCelebrationHeadline handles singular and plural', () => {
  assert.equal(buildPrCelebrationHeadline(1), 'New Personal Record!')
  assert.equal(buildPrCelebrationHeadline(2), '2 New Personal Records!')
})

test('formatPrAchievementLabel uses weight unit for e1rm records', () => {
  const label = formatPrAchievementLabel(
    {
      exerciseId: 'ex-1',
      exerciseName: 'Back Squat',
      recordType: 'e1rm',
      e1rm: 315,
      weight: null,
      reps: null,
      forced: false,
    },
    'kg'
  )

  assert.equal(label, '315 kg e1RM')
})

test('buildPrShareText includes workout and PR lines', () => {
  const text = buildPrShareText({
    workoutName: 'Lower A',
    athleteName: 'Jake',
    prs: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Back Squat',
        recordType: 'top_set',
        e1rm: null,
        weight: 315,
        reps: 5,
        forced: false,
      },
    ],
  })

  assert.match(text, /Jake hit a new PR!/)
  assert.match(text, /Lower A/)
  assert.match(text, /Back Squat/)
})
