import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO,
  GUIDED_EXERCISE_SWIPE_THRESHOLD_PX,
  resolveGuidedExerciseSwipeDirection,
} from '@/lib/hooks/use-guided-exercise-swipe-navigation'

test('resolveGuidedExerciseSwipeDirection returns next for left swipes', () => {
  assert.equal(
    resolveGuidedExerciseSwipeDirection({
      deltaX: -80,
      deltaY: 10,
    }),
    'next'
  )
})

test('resolveGuidedExerciseSwipeDirection returns previous for right swipes', () => {
  assert.equal(
    resolveGuidedExerciseSwipeDirection({
      deltaX: 80,
      deltaY: 10,
    }),
    'previous'
  )
})

test('resolveGuidedExerciseSwipeDirection ignores short or vertical gestures', () => {
  assert.equal(
    resolveGuidedExerciseSwipeDirection({
      deltaX: -20,
      deltaY: 0,
      threshold: GUIDED_EXERCISE_SWIPE_THRESHOLD_PX,
    }),
    null
  )

  assert.equal(
    resolveGuidedExerciseSwipeDirection({
      deltaX: -80,
      deltaY: 120,
      threshold: GUIDED_EXERCISE_SWIPE_THRESHOLD_PX,
      horizontalRatio: GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO,
    }),
    null
  )
})
