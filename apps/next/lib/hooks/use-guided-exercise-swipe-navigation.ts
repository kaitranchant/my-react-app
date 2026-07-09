'use client'

import * as React from 'react'

export const GUIDED_EXERCISE_SWIPE_THRESHOLD_PX = 50
export const GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO = 1.5

const SWIPE_IGNORE_SELECTOR = [
  'input',
  'textarea',
  'button',
  'select',
  'a',
  '[data-workout-log-swipeable-set-row]',
  '[data-workout-log-field]',
  '[contenteditable="true"]',
].join(', ')

type TouchTracking = {
  startX: number
  startY: number
  active: boolean
}

export function resolveGuidedExerciseSwipeDirection(input: {
  deltaX: number
  deltaY: number
  threshold?: number
  horizontalRatio?: number
}): 'previous' | 'next' | null {
  const threshold = input.threshold ?? GUIDED_EXERCISE_SWIPE_THRESHOLD_PX
  const horizontalRatio =
    input.horizontalRatio ?? GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO
  const absX = Math.abs(input.deltaX)
  const absY = Math.abs(input.deltaY)

  if (absX < threshold || absX < absY * horizontalRatio) {
    return null
  }

  return input.deltaX > 0 ? 'previous' : 'next'
}

export function shouldIgnoreGuidedExerciseSwipeTarget(
  target: EventTarget | null
): boolean {
  if (!(target instanceof Element)) {
    return true
  }

  return Boolean(target.closest(SWIPE_IGNORE_SELECTOR))
}

type UseGuidedExerciseSwipeNavigationOptions = {
  enabled: boolean
  canGoPrevious: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
}

export function useGuidedExerciseSwipeNavigation({
  enabled,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: UseGuidedExerciseSwipeNavigationOptions) {
  const touchRef = React.useRef<TouchTracking | null>(null)

  const resetTouch = React.useCallback(() => {
    touchRef.current = null
  }, [])

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!enabled || event.touches.length !== 1) {
        resetTouch()
        return
      }

      const touch = event.touches[0]
      if (!touch || shouldIgnoreGuidedExerciseSwipeTarget(event.target)) {
        resetTouch()
        return
      }

      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
      }
    },
    [enabled, resetTouch]
  )

  const handleTouchMove = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const tracking = touchRef.current
      if (!tracking?.active || event.touches.length !== 1) {
        return
      }

      const touch = event.touches[0]
      if (!touch) {
        resetTouch()
        return
      }

      const deltaX = touch.clientX - tracking.startX
      const deltaY = touch.clientY - tracking.startY
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (absY > GUIDED_EXERCISE_SWIPE_THRESHOLD_PX && absY > absX) {
        tracking.active = false
      }
    },
    [resetTouch]
  )

  const handleTouchEnd = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const tracking = touchRef.current
      if (!tracking?.active) {
        resetTouch()
        return
      }

      const touch = event.changedTouches[0]
      if (!touch) {
        resetTouch()
        return
      }

      const direction = resolveGuidedExerciseSwipeDirection({
        deltaX: touch.clientX - tracking.startX,
        deltaY: touch.clientY - tracking.startY,
      })

      resetTouch()

      if (direction === 'previous' && canGoPrevious) {
        onPrevious()
        return
      }

      if (direction === 'next' && canGoNext) {
        onNext()
      }
    },
    [canGoNext, canGoPrevious, onNext, onPrevious, resetTouch]
  )

  const swipeProps = enabled
    ? {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: resetTouch,
      }
    : {}

  return { swipeProps }
}
