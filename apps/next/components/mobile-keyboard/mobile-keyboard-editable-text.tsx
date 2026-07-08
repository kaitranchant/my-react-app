'use client'

import * as React from 'react'

import { MobileKeyboardCaret } from '@/components/mobile-keyboard/mobile-keyboard-caret'
import { caretIndexFromPoint } from '@/lib/mobile-keyboard/caret'
import { cn } from '@/lib/utils'

type MobileKeyboardEditableTextProps = {
  value: string
  caretIndex: number
  multiline?: boolean
  placeholder?: string
  isActive: boolean
  className?: string
  onPlaceCaret: (index: number) => void
  /** When true, ignore placement if the pointer moved (scroll vs tap). */
  scrollAware?: boolean
}

const TAP_MOVE_THRESHOLD_PX = 8

/**
 * Renders faux-field / typing-preview text with a movable caret.
 * Tap (not drag) places the insertion point via caretRangeFromPoint.
 */
export function MobileKeyboardEditableText({
  value,
  caretIndex,
  multiline = false,
  placeholder,
  isActive,
  className,
  onPlaceCaret,
  scrollAware = false,
}: MobileKeyboardEditableTextProps) {
  const textRef = React.useRef<HTMLSpanElement>(null)
  const pointerRef = React.useRef<{ x: number; y: number } | null>(null)
  const movedRef = React.useRef(false)

  const showPlaceholder = !value && !isActive
  const display = showPlaceholder ? placeholder ?? '' : value
  const safeCaret = Math.max(0, Math.min(value.length, caretIndex))
  const before = isActive ? value.slice(0, safeCaret) : display
  const after = isActive ? value.slice(safeCaret) : ''

  function placeFromPoint(clientX: number, clientY: number) {
    const node = textRef.current
    if (!node || !isActive) return
    onPlaceCaret(caretIndexFromPoint(node, clientX, clientY, value))
  }

  return (
    <span
      ref={textRef}
      className={cn(
        'relative block w-full',
        multiline ? 'break-words whitespace-pre-wrap' : 'truncate',
        showPlaceholder && 'text-muted-foreground',
        className
      )}
      onPointerDown={(event) => {
        if (!isActive) return
        pointerRef.current = { x: event.clientX, y: event.clientY }
        movedRef.current = false
      }}
      onPointerMove={(event) => {
        if (!pointerRef.current || movedRef.current) return
        const dx = event.clientX - pointerRef.current.x
        const dy = event.clientY - pointerRef.current.y
        if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
          movedRef.current = true
        }
      }}
      onPointerUp={(event) => {
        if (!isActive) return
        const moved = movedRef.current
        pointerRef.current = null
        if (scrollAware && moved) return
        placeFromPoint(event.clientX, event.clientY)
      }}
      onPointerCancel={() => {
        pointerRef.current = null
        movedRef.current = true
      }}
    >
      {before}
      {isActive ? <MobileKeyboardCaret className="ml-px" /> : null}
      {after}
    </span>
  )
}
