'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import {
  GUIDED_EXERCISE_SLIDE_DURATION_MS,
  type GuidedExerciseSlideDirection,
} from '@/lib/hooks/use-guided-exercise-swipe-navigation'

type GuidedExerciseCarouselProps = {
  activeKey: string
  direction: GuidedExerciseSlideDirection | null
  dragOffset: number
  isDragging: boolean
  isAnimating: boolean
  preferDragTransition?: boolean
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

export function GuidedExerciseCarousel({
  activeKey,
  direction,
  dragOffset,
  isDragging,
  isAnimating,
  preferDragTransition = true,
  className,
  children,
  ...swipeProps
}: GuidedExerciseCarouselProps) {
  const reduceMotion = React.useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  )

  const followFinger = isDragging || isAnimating
  const showEnterAnimation = !reduceMotion && !followFinger && direction != null
  const animateDrag =
    preferDragTransition && !isDragging && !reduceMotion

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 touch-pan-y flex-col overflow-hidden',
        className
      )}
      {...swipeProps}
    >
      <div
        className={cn(
          'flex min-h-0 w-full flex-1 flex-col will-change-transform',
          animateDrag && 'transition-transform ease-out'
        )}
        style={{
          transform: `translate3d(${dragOffset}px, 0, 0)`,
          transitionDuration: animateDrag
            ? `${GUIDED_EXERCISE_SLIDE_DURATION_MS}ms`
            : undefined,
        }}
      >
        <div
          key={activeKey}
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col',
            showEnterAnimation && 'animate-in fade-in',
            showEnterAnimation && direction === 'next' && 'slide-in-from-right',
            showEnterAnimation &&
              direction === 'previous' &&
              'slide-in-from-left'
          )}
          style={{
            animationDuration: showEnterAnimation
              ? `${GUIDED_EXERCISE_SLIDE_DURATION_MS}ms`
              : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }

  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
