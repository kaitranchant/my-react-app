'use client'

import * as React from 'react'

export const GUIDED_EXERCISE_SWIPE_THRESHOLD_PX = 50
export const GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO = 1.5
export const GUIDED_EXERCISE_SLIDE_DURATION_MS = 280
const EDGE_RESISTANCE = 0.28

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
  horizontal: boolean
  width: number
}

export type GuidedExerciseSlideDirection = 'previous' | 'next'

export function resolveGuidedExerciseSwipeDirection(input: {
  deltaX: number
  deltaY: number
  threshold?: number
  horizontalRatio?: number
}): GuidedExerciseSlideDirection | null {
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

export function applyGuidedExerciseSwipeResistance(input: {
  deltaX: number
  canGoPrevious: boolean
  canGoNext: boolean
}): number {
  const { deltaX, canGoPrevious, canGoNext } = input

  if (deltaX > 0 && !canGoPrevious) {
    return deltaX * EDGE_RESISTANCE
  }

  if (deltaX < 0 && !canGoNext) {
    return deltaX * EDGE_RESISTANCE
  }

  return deltaX
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
  const commitTimeoutRef = React.useRef<number | null>(null)
  const dragOffsetRef = React.useRef(0)
  const [dragOffset, setDragOffsetState] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const [preferDragTransition, setPreferDragTransition] = React.useState(true)

  const setDragOffset = React.useCallback((value: number) => {
    dragOffsetRef.current = value
    setDragOffsetState(value)
  }, [])

  const clearCommitTimeout = React.useCallback(() => {
    if (commitTimeoutRef.current != null) {
      window.clearTimeout(commitTimeoutRef.current)
      commitTimeoutRef.current = null
    }
  }, [])

  const resetTouch = React.useCallback(() => {
    touchRef.current = null
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    return () => clearCommitTimeout()
  }, [clearCommitTimeout])

  React.useEffect(() => {
    if (!enabled) {
      clearCommitTimeout()
      resetTouch()
      setDragOffset(0)
      setIsAnimating(false)
      setPreferDragTransition(true)
    }
  }, [clearCommitTimeout, enabled, resetTouch, setDragOffset])

  const commitNavigation = React.useCallback(
    (direction: GuidedExerciseSlideDirection, width: number) => {
      const target = direction === 'next' ? -width : width
      setIsDragging(false)
      setPreferDragTransition(true)
      setIsAnimating(true)
      setDragOffset(target)

      clearCommitTimeout()
      commitTimeoutRef.current = window.setTimeout(() => {
        commitTimeoutRef.current = null
        // Jump back to center without animating the outgoing offset in reverse.
        setPreferDragTransition(false)
        setDragOffset(0)
        setIsAnimating(false)
        if (direction === 'next') {
          onNext()
        } else {
          onPrevious()
        }
        requestAnimationFrame(() => {
          setPreferDragTransition(true)
        })
      }, GUIDED_EXERCISE_SLIDE_DURATION_MS)
    },
    [clearCommitTimeout, onNext, onPrevious, setDragOffset]
  )

  const settleBack = React.useCallback(() => {
    setIsDragging(false)
    setPreferDragTransition(true)
    setIsAnimating(true)
    setDragOffset(0)

    clearCommitTimeout()
    commitTimeoutRef.current = window.setTimeout(() => {
      commitTimeoutRef.current = null
      setIsAnimating(false)
    }, GUIDED_EXERCISE_SLIDE_DURATION_MS)
  }, [clearCommitTimeout, setDragOffset])

  const handleTouchStart = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!enabled || isAnimating || event.touches.length !== 1) {
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
        horizontal: false,
        width: event.currentTarget.getBoundingClientRect().width,
      }
    },
    [enabled, isAnimating, resetTouch]
  )

  const handleTouchMove = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const tracking = touchRef.current
      if (!tracking?.active || isAnimating || event.touches.length !== 1) {
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
          setIsDragging(false)
          setDragOffset(0)
          return
        }

        if (
          absX < GUIDED_EXERCISE_SWIPE_THRESHOLD_PX ||
          absX < absY * GUIDED_EXERCISE_SWIPE_HORIZONTAL_RATIO
        ) {
          return
        }

        tracking.horizontal = true
        setIsDragging(true)
      }

      setDragOffset(
        applyGuidedExerciseSwipeResistance({
          deltaX,
          canGoPrevious,
          canGoNext,
        })
      )
    },
    [canGoNext, canGoPrevious, isAnimating, resetTouch]
  )

  const handleTouchEnd = React.useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const tracking = touchRef.current
      if (!tracking?.active || isAnimating) {
        resetTouch()
        return
      }

      const touch = event.changedTouches[0]
      if (!touch || !tracking.horizontal) {
        resetTouch()
        setDragOffset(0)
        return
      }

      const deltaX = touch.clientX - tracking.startX
      const direction = resolveGuidedExerciseSwipeDirection({
        deltaX,
        deltaY: touch.clientY - tracking.startY,
      })

      resetTouch()

      const canCommit =
        (direction === 'previous' && canGoPrevious) ||
        (direction === 'next' && canGoNext)

      if (direction && canCommit) {
        commitNavigation(
          direction,
          tracking.width || event.currentTarget.getBoundingClientRect().width
        )
        return
      }

      settleBack()
    },
    [
      canGoNext,
      canGoPrevious,
      commitNavigation,
      isAnimating,
      resetTouch,
      settleBack,
    ]
  )

  const swipeProps = enabled
    ? {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: () => {
          resetTouch()
          if (dragOffsetRef.current !== 0) {
            settleBack()
          }
        },
      }
    : {}

  return {
    swipeProps,
    dragOffset,
    isDragging,
    isAnimating,
    preferDragTransition: preferDragTransition && !isDragging,
  }
}
