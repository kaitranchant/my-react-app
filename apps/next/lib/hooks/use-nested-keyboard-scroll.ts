'use client'

import * as React from 'react'

import { scheduleFocusedInputScroll } from '@/lib/visual-viewport/app-viewport'

/**
 * Marks a nested scroll region and scrolls focused inputs into view after the
 * mobile keyboard finishes opening (avoids fighting browser auto-scroll).
 */
export function useNestedKeyboardScroll<
  T extends HTMLElement = HTMLDivElement,
>() {
  const scrollRef = React.useRef<T>(null)

  React.useEffect(() => {
    const scrollParent = scrollRef.current
    if (!scrollParent) return

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (!scrollParent.contains(target)) return
      if (
        !target.matches(
          'input:not([type="hidden"]), textarea, select, [contenteditable="true"]'
        )
      ) {
        return
      }

      scheduleFocusedInputScroll(target, scrollParent)
    }

    scrollParent.addEventListener('focusin', onFocusIn)
    return () => scrollParent.removeEventListener('focusin', onFocusIn)
  }, [])

  return {
    scrollRef,
    scrollProps: {
      ref: scrollRef,
      'data-nested-keyboard-scroll': true,
    } as const,
  }
}
