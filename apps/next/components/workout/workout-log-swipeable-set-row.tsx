'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const ACTION_WIDTH = 72
const SWIPE_START_THRESHOLD = 10
const DELETE_RELEASE_THRESHOLD = ACTION_WIDTH * 0.85

type WorkoutLogSwipeableSetRowProps = {
  enabled: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  onInteractionStart?: () => void
  className?: string
  children: React.ReactNode
}

export function WorkoutLogSwipeableSetRow({
  enabled,
  open,
  onOpenChange,
  onDelete,
  onInteractionStart,
  className,
  children,
}: WorkoutLogSwipeableSetRowProps) {
  const [dragOffset, setDragOffset] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const dragRef = React.useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    startOffset: 0,
    swiping: false,
  })

  const offset = dragging ? dragOffset : open ? ACTION_WIDTH : 0

  const clampOffset = React.useCallback(
    (value: number) => Math.max(0, Math.min(ACTION_WIDTH, value)),
    []
  )

  const resetDrag = React.useCallback(() => {
    dragRef.current = {
      pointerId: null,
      startX: 0,
      startY: 0,
      startOffset: 0,
      swiping: false,
    }
    setDragging(false)
    setDragOffset(0)
  }, [])

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return

      onInteractionStart?.()

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: open ? ACTION_WIDTH : 0,
        swiping: false,
      }
    },
    [enabled, onInteractionStart, open]
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (drag.pointerId !== event.pointerId) return

      const dx = drag.startX - event.clientX
      const dy = Math.abs(event.clientY - drag.startY)

      if (!drag.swiping) {
        if (Math.abs(dx) < SWIPE_START_THRESHOLD) return
        if (Math.abs(dx) < dy) {
          dragRef.current.pointerId = null
          return
        }
        dragRef.current.swiping = true
        setDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      }

      setDragOffset(clampOffset(drag.startOffset + dx))
    },
    [clampOffset]
  )

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (drag.pointerId !== event.pointerId) return

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      if (!drag.swiping) {
        resetDrag()
        return
      }

      const finalOffset = clampOffset(drag.startOffset + (drag.startX - event.clientX))

      if (finalOffset >= DELETE_RELEASE_THRESHOLD) {
        onOpenChange(false)
        onDelete()
        resetDrag()
        return
      }

      onOpenChange(finalOffset >= ACTION_WIDTH / 2)
      resetDrag()
    },
    [clampOffset, onDelete, onOpenChange, resetDrag]
  )

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className="bg-destructive absolute inset-y-0 right-0 flex items-center justify-center"
        style={{ width: ACTION_WIDTH }}
        aria-hidden={!open && !dragging}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            onOpenChange(false)
            onDelete()
          }}
          className="text-destructive-foreground flex size-full items-center justify-center transition-opacity"
          aria-label="Delete set"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div
        className={cn(
          'bg-muted/25 relative touch-pan-y select-none',
          !dragging && 'transition-transform duration-200 ease-out'
        )}
        style={{ transform: `translateX(-${offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {children}
      </div>
    </div>
  )
}
