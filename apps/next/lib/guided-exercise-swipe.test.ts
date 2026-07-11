import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO,
  GUIDED_EXERCISE_SWIPE_THRESHOLD_PX,
  applyGuidedExerciseSwipeResistance,
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

test('applyGuidedExerciseSwipeResistance rubber-bands at edges', () => {
  assert.ok(
    Math.abs(
      applyGuidedExerciseSwipeResistance({
        deltaX: -100,
        canGoPrevious: true,
        canGoNext: false,
      }) - -28
    ) < 0.001
  )

  assert.ok(
    Math.abs(
      applyGuidedExerciseSwipeResistance({
        deltaX: 100,
        canGoPrevious: false,
        canGoNext: true,
      }) - 28
    ) < 0.001
  )

  assert.equal(
    applyGuidedExerciseSwipeResistance({
      deltaX: -100,
      canGoPrevious: true,
      canGoNext: true,
    }),
    -100
  )
})
