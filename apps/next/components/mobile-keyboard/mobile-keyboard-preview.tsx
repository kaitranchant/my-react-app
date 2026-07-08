'use client'

import * as React from 'react'

import { HideKeyboardIcon, KeypadButton } from '@/components/mobile-keyboard/keypad-surface'
import type { MobileKeyboardFieldKind } from '@/components/mobile-keyboard/mobile-keyboard-context'
import { cn } from '@/lib/utils'

type MobileKeyboardPreviewProps = {
  value: string
  kind: MobileKeyboardFieldKind
  onClose: () => void
}

/**
 * Live typing preview above the custom keyboard so the typed characters are
 * visible even when the focused field is partially covered.
 */
export function MobileKeyboardPreview({
  value,
  kind,
  onClose,
}: MobileKeyboardPreviewProps) {
  const isEmpty = value.length === 0
  const isMultiline = kind === 'textarea'
  const previewRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const node = previewRef.current
    if (!node) return
    if (isMultiline) {
      node.scrollTop = node.scrollHeight
    } else {
      node.scrollLeft = node.scrollWidth
    }
  }, [value, isMultiline])

  return (
    <div className="flex items-end gap-2 border-b px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground mb-0.5 text-[11px] font-medium tracking-wide uppercase">
          Typing
        </p>
        <div
          ref={previewRef}
          className={cn(
            'bg-muted/50 text-foreground relative rounded-lg border px-3 py-2',
            isMultiline
              ? 'max-h-[4.75rem] min-h-[2.75rem] overflow-y-auto'
              : 'min-h-11 overflow-x-auto whitespace-nowrap'
          )}
        >
          <p
            className={cn(
              'text-base leading-snug',
              isMultiline && 'break-words whitespace-pre-wrap',
              isEmpty && 'text-muted-foreground'
            )}
          >
            {isEmpty ? 'Start typing…' : value}
            <span aria-hidden className="mobile-keyboard-caret ml-0.5 align-[-0.05em]" />
          </p>
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
