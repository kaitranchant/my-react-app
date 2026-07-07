'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const ACTION_WIDTH = 72
const SWIPE_START_THRESHOLD = 10
const DELETE_SWIPE_RATIO = 0.35

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
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [dragOffset, setDragOffset] = React.useState(0)
  const [dragging, setDragging] = React.useState(false)
  const [exiting, setExiting] = React.useState(false)
  const dragRef = React.useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    startOffset: 0,
    swiping: false,
  })

  React.useEffect(() => {
    const node = containerRef.current
    if (!node || !enabled) return

    const updateWidth = () => {
      setContainerWidth(node.getBoundingClientRect().width)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled])

  const maxOffset = containerWidth || ACTION_WIDTH
  const offset = dragging ? dragOffset : open ? ACTION_WIDTH : 0
  const deleteThreshold = Math.max(
    ACTION_WIDTH * 0.85,
    maxOffset * DELETE_SWIPE_RATIO
  )

  const clampOffset = React.useCallback(
    (value: number) => Math.max(0, Math.min(maxOffset, value)),
    [maxOffset]
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

  const beginDelete = React.useCallback(
    (swipeOffset = 0) => {
      if (exiting) return

      onOpenChange(false)
      setDragging(false)
      setDragOffset(swipeOffset)
      setExiting(true)
      onDelete()
    },
    [exiting, onDelete, onOpenChange]
  )

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || exiting || event.button !== 0) return

      onInteractionStart?.()

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: open ? ACTION_WIDTH : 0,
        swiping: false,
      }
    },
    [enabled, exiting, onInteractionStart, open]
  )

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (drag.pointerId !== event.pointerId || exiting) return

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
    [clampOffset, exiting]
  )

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (drag.pointerId !== event.pointerId || exiting) return

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      if (!drag.swiping) {
        resetDrag()
        return
      }

      const finalOffset = clampOffset(
        drag.startOffset + (drag.startX - event.clientX)
      )

      if (finalOffset >= deleteThreshold) {
        beginDelete(finalOffset)
        resetDrag()
        return
      }

      onOpenChange(finalOffset >= ACTION_WIDTH / 2)
      resetDrag()
    },
    [beginDelete, clampOffset, deleteThreshold, exiting, onOpenChange, resetDrag]
  )

  if (!enabled) {
    return <div className={className}>{children}</div>
  }

  const contentOffset = exiting ? maxOffset : offset

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
        exiting && 'pointer-events-none opacity-0',
        className
      )}
      style={{ gridTemplateRows: exiting ? '0fr' : '1fr' }}
    >
      <div ref={containerRef} className="relative min-h-0 overflow-hidden">
        <div
          className="bg-destructive absolute inset-y-0 right-0 flex items-center justify-end"
          style={{ width: Math.max(contentOffset, 0) }}
          aria-hidden={!open && !dragging && !exiting}
        >
          <div
            className="flex h-full shrink-0 items-center justify-center"
            style={{ width: ACTION_WIDTH }}
          >
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              disabled={exiting}
              onClick={() => beginDelete(open ? ACTION_WIDTH : 0)}
              className="text-destructive-foreground flex size-full items-center justify-center transition-opacity"
              aria-label="Delete set"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            'bg-background relative z-10 w-full touch-pan-y select-none',
            exiting || !dragging
              ? 'transition-[transform,opacity] duration-300 ease-in'
              : 'transition-transform duration-200 ease-out',
            exiting && 'opacity-0'
          )}
          style={{
            transform: exiting
              ? `translateX(-${maxOffset}px)`
              : `translateX(-${contentOffset}px)`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
