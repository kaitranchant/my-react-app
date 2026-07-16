'use client'

import * as React from 'react'

import {
  GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO,
  GUIDED_EXERCISE_SWIPE_THRESHOLD_PX,
  resolveGuidedExerciseSwipeDirection,
} from '@/lib/hooks/use-guided-exercise-swipe-navigation'

const DEFAULT_IGNORE_SELECTOR = [
  'a',
  'input',
  'textarea',
  'select',
  '[data-swipe-ignore]',
].join(', ')

type TouchTracking = {
  startX: number
  startY: number
  active: boolean
  horizontal: boolean
}

type UseHorizontalSwipeNavigationOptions = {
  enabled: boolean
  onPrevious: () => void
  onNext: () => void
  /** Extra CSS selectors that should not start a swipe (e.g. action buttons). */
  ignoreSelector?: string
}

function shouldIgnoreSwipeTarget(
  target: EventTarget | null,
  ignoreSelector: string
): boolean {
  if (!(target instanceof Element)) {
    return true
  }

  return Boolean(target.closest(ignoreSelector))
}

export function useHorizontalSwipeNavigation({
  enabled,
  onPrevious,
  onNext,
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
}: UseHorizontalSwipeNavigationOptions) {
  const touchRef = React.useRef<TouchTracking | null>(null)
  const suppressClickRef = React.useRef(false)

  const resetTouch = React.useCallback(() => {
    touchRef.current = null
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      resetTouch()
      suppressClickRef.current = false
    }
  }, [enabled, resetTouch])

  React.useEffect(() => {
    if (!enabled) return

    function handleClickCapture(event: MouseEvent) {
      if (!suppressClickRef.current) return
      event.preventDefault()
      event.stopPropagation()
      suppressClickRef.current = false
    }

    document.addEventListener('click', handleClickCapture, true)
    return () => document.removeEventListener('click', handleClickCapture, true)
  }, [enabled])

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!enabled || event.touches.length !== 1) {
        resetTouch()
        return
      }

      const touch = event.touches[0]
      if (!touch || shouldIgnoreSwipeTarget(event.target, ignoreSelector)) {
        resetTouch()
        return
      }

      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        horizontal: false,
      }
    },
    [enabled, ignoreSelector, resetTouch]
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

      if (!tracking.horizontal) {
        if (absY > GUIDED_EXERCISE_SWIPE_THRESHOLD_PX && absY > absX) {
          tracking.active = false
          return
        }

        if (
          absX < GUIDED_EXERCISE_SWIPE_THRESHOLD_PX ||
          absX < absY * GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO
        ) {
          return
        }

        tracking.horizontal = true
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
      if (!touch || !tracking.horizontal) {
        resetTouch()
        return
      }

      const direction = resolveGuidedExerciseSwipeDirection({
        deltaX: touch.clientX - tracking.startX,
        deltaY: touch.clientY - tracking.startY,
      })

      resetTouch()

      if (!direction) return

      suppressClickRef.current = true
      if (direction === 'next') {
        onNext()
      } else {
        onPrevious()
      }
    },
    [onNext, onPrevious, resetTouch]
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
