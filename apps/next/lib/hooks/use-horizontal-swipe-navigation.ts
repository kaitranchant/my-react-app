'use client'

import * as React from 'react'

import { resolveGuidedExerciseSwipeDirection } from '@/lib/hooks/use-guided-exercise-swipe-navigation'

const DEFAULT_IGNORE_SELECTOR = [
  'a',
  'input',
  'textarea',
  'select',
  '[data-swipe-ignore]',
].join(', ')

/** Slightly looser than guided-exercise so day swipes work on scrollable pages. */
const DAY_SWIPE_THRESHOLD_PX = 36
const DAY_SWIPE_HORIZONTAL_RATIO = 1.2

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
  thresholdPx?: number
  horizontalRatio?: number
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

/**
 * Horizontal swipe navigation that claims the gesture once horizontal intent
 * is clear. Uses native non-passive touch listeners so preventDefault works
 * (React's delegated touch handlers are often passive).
 */
export function useHorizontalSwipeNavigation({
  enabled,
  onPrevious,
  onNext,
  ignoreSelector = DEFAULT_IGNORE_SELECTOR,
  thresholdPx = DAY_SWIPE_THRESHOLD_PX,
  horizontalRatio = DAY_SWIPE_HORIZONTAL_RATIO,
}: UseHorizontalSwipeNavigationOptions) {
  const [container, setContainer] = React.useState<HTMLElement | null>(null)
  const touchRef = React.useRef<TouchTracking | null>(null)
  const suppressClickRef = React.useRef(false)
  const onPreviousRef = React.useRef(onPrevious)
  const onNextRef = React.useRef(onNext)
  const ignoreSelectorRef = React.useRef(ignoreSelector)
  const thresholdRef = React.useRef(thresholdPx)
  const ratioRef = React.useRef(horizontalRatio)

  onPreviousRef.current = onPrevious
  onNextRef.current = onNext
  ignoreSelectorRef.current = ignoreSelector
  thresholdRef.current = thresholdPx
  ratioRef.current = horizontalRatio

  const resetTouch = React.useCallback(() => {
    touchRef.current = null
  }, [])

  const setContainerRef = React.useCallback((node: HTMLElement | null) => {
    setContainer(node)
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

  React.useEffect(() => {
    if (!enabled || !container) return

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        resetTouch()
        return
      }

      const touch = event.touches[0]
      if (
        !touch ||
        shouldIgnoreSwipeTarget(event.target, ignoreSelectorRef.current)
      ) {
        resetTouch()
        return
      }

      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        active: true,
        horizontal: false,
      }
    }

    function handleTouchMove(event: TouchEvent) {
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
      const threshold = thresholdRef.current
      const ratio = ratioRef.current

      if (!tracking.horizontal) {
        if (absY > threshold && absY > absX) {
          tracking.active = false
          return
        }

        if (absX < threshold || absX < absY * ratio) {
          return
        }

        tracking.horizontal = true
      }

      // Claim the gesture so the page does not scroll / cancel the swipe.
      if (event.cancelable) {
        event.preventDefault()
      }
    }

    function handleTouchEnd(event: TouchEvent) {
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
        threshold: thresholdRef.current,
        horizontalRatio: ratioRef.current,
      })

      resetTouch()

      if (!direction) return

      suppressClickRef.current = true
      if (direction === 'next') {
        onNextRef.current()
      } else {
        onPreviousRef.current()
      }
    }

    function handleTouchCancel() {
      resetTouch()
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchCancel)
      resetTouch()
    }
  }, [container, enabled, resetTouch])

  return {
    swipeProps: {
      ref: setContainerRef,
    },
  }
}
