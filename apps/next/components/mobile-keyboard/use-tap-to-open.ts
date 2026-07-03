'use client'

import * as React from 'react'

const TAP_MOVE_THRESHOLD_PX = 10

export function useTapToOpen(onTap: () => void, disabled = false) {
  const startRef = React.useRef<{ x: number; y: number } | null>(null)
  const cancelledRef = React.useRef(false)

  return React.useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (disabled) return
        startRef.current = { x: event.clientX, y: event.clientY }
        cancelledRef.current = false
      },
      onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
        const start = startRef.current
        if (!start || cancelledRef.current) return
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
          cancelledRef.current = true
        }
      },
      onPointerUp: () => {
        if (disabled || cancelledRef.current || !startRef.current) {
          startRef.current = null
          return
        }
        startRef.current = null
        onTap()
      },
      onPointerCancel: () => {
        startRef.current = null
        cancelledRef.current = true
      },
    }),
    [disabled, onTap]
  )
}
