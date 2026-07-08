'use client'

import { cn } from '@/lib/utils'

type MobileKeyboardCaretProps = {
  className?: string
}

/** Blinking caret shown at the insertion point of an active mobile keyboard field. */
export function MobileKeyboardCaret({ className }: MobileKeyboardCaretProps) {
  return (
    <span
      aria-hidden
      className={cn('mobile-keyboard-caret', className)}
    />
  )
}
