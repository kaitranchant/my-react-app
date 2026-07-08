'use client'

import * as React from 'react'

import { HideKeyboardIcon, KeypadButton } from '@/components/mobile-keyboard/keypad-surface'
import { MobileKeyboardEditableText } from '@/components/mobile-keyboard/mobile-keyboard-editable-text'
import type { MobileKeyboardFieldKind } from '@/components/mobile-keyboard/mobile-keyboard-context'
import { cn } from '@/lib/utils'

type MobileKeyboardPreviewProps = {
  value: string
  caretIndex: number
  kind: MobileKeyboardFieldKind
  onClose: () => void
  onPlaceCaret: (index: number) => void
}

const TAP_MOVE_THRESHOLD_PX = 10

/**
 * Live typing preview above the custom keyboard so the typed characters are
 * visible even when the focused field is partially covered.
 * Uses manual touch scrolling so parent keypad touch-action cannot block pans.
 */
export function MobileKeyboardPreview({
  value,
  caretIndex,
  kind,
  onClose,
  onPlaceCaret,
}: MobileKeyboardPreviewProps) {
  const isEmpty = value.length === 0
  const isMultiline = kind === 'textarea'
  const previewRef = React.useRef<HTMLDivElement>(null)
  const stickToEndRef = React.useRef(true)
  const dragRef = React.useRef<{
    y: number
    x: number
    scrollTop: number
    scrollLeft: number
    moved: boolean
  } | null>(null)

  React.useEffect(() => {
    const node = previewRef.current
    if (!node || !stickToEndRef.current) return
    if (isMultiline) {
      node.scrollTop = node.scrollHeight
    } else {
      node.scrollLeft = node.scrollWidth
    }
  }, [value, caretIndex, isMultiline])

  function updateStickToEnd() {
    const node = previewRef.current
    if (!node) return

    if (isMultiline) {
      const distanceFromBottom =
        node.scrollHeight - node.scrollTop - node.clientHeight
      stickToEndRef.current = distanceFromBottom < 24
      return
    }

    const distanceFromRight =
      node.scrollWidth - node.scrollLeft - node.clientWidth
    stickToEndRef.current = distanceFromRight < 24
  }

  React.useEffect(() => {
    const node = previewRef.current
    if (!node) return

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      const drag = dragRef.current
      if (!touch || !drag) return

      const dy = drag.y - touch.clientY
      const dx = drag.x - touch.clientX
      if (
        Math.abs(dy) > TAP_MOVE_THRESHOLD_PX ||
        Math.abs(dx) > TAP_MOVE_THRESHOLD_PX
      ) {
        drag.moved = true
      }

      if (isMultiline) {
        if (Math.abs(dy) < 1) return
        event.preventDefault()
        event.stopPropagation()
        node.scrollTop = drag.scrollTop + dy
        stickToEndRef.current = false
        updateStickToEnd()
      } else {
        if (Math.abs(dx) < 1) return
        event.preventDefault()
        event.stopPropagation()
        node.scrollLeft = drag.scrollLeft + dx
        stickToEndRef.current = false
        updateStickToEnd()
      }
    }

    node.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => node.removeEventListener('touchmove', onTouchMove)
  }, [isMultiline])

  return (
    <div className="flex items-end gap-2 border-b px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground mb-0.5 text-[11px] font-medium tracking-wide uppercase">
          Typing
        </p>
        <div
          ref={previewRef}
          data-nested-keyboard-scroll=""
          onScroll={updateStickToEnd}
          onTouchStart={(event) => {
            const touch = event.touches[0]
            if (!touch || !previewRef.current) return
            dragRef.current = {
              y: touch.clientY,
              x: touch.clientX,
              scrollTop: previewRef.current.scrollTop,
              scrollLeft: previewRef.current.scrollLeft,
              moved: false,
            }
          }}
          onTouchEnd={() => {
            dragRef.current = null
            updateStickToEnd()
          }}
          onTouchCancel={() => {
            dragRef.current = null
          }}
          className={cn(
            'bg-muted/50 text-foreground relative rounded-lg border px-3 py-2',
            isMultiline
              ? 'mobile-keypad-typing-scroll'
              : 'mobile-keypad-typing-scroll-x'
          )}
        >
          <MobileKeyboardEditableText
            value={value}
            caretIndex={caretIndex}
            multiline={isMultiline}
            placeholder="Start typing…"
            isActive
            scrollAware
            onPlaceCaret={(index) => {
              if (dragRef.current?.moved) return
              stickToEndRef.current = false
              onPlaceCaret(index)
            }}
            className={cn(isEmpty && 'text-muted-foreground')}
          />
        </div>
      </div>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={onClose}
        className="size-11 shrink-0 sm:size-12"
      >
        <HideKeyboardIcon />
      </KeypadButton>
    </div>
  )
}
