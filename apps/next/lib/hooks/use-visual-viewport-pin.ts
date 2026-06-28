'use client'

import { useLayoutEffect, type RefObject } from 'react'

const VIEWPORT_MARGIN_PX = 8

function resetWindowScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/** Keeps a fixed overlay aligned with the visual viewport (iOS keyboard-safe). */
export function useVisualViewportPin(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean
) {
  useLayoutEffect(() => {
    if (!enabled) return

    const el = ref.current
    const visualViewport = window.visualViewport
    if (!el || !visualViewport) return

    const apply = () => {
      const top = visualViewport.offsetTop + VIEWPORT_MARGIN_PX
      const left = visualViewport.offsetLeft + VIEWPORT_MARGIN_PX
      const width = Math.max(0, visualViewport.width - VIEWPORT_MARGIN_PX * 2)
      const height = Math.max(0, visualViewport.height - VIEWPORT_MARGIN_PX * 2)

      el.style.top = `${top}px`
      el.style.left = `${left}px`
      el.style.width = `${width}px`
      el.style.height = `${height}px`
      el.style.bottom = 'auto'
      el.style.right = 'auto'
      el.style.maxHeight = 'none'
      el.style.transform = 'none'
    }

    const clear = () => {
      el.style.top = ''
      el.style.left = ''
      el.style.width = ''
      el.style.height = ''
      el.style.bottom = ''
      el.style.right = ''
      el.style.maxHeight = ''
      el.style.transform = ''
    }

    apply()
    visualViewport.addEventListener('resize', apply)
    visualViewport.addEventListener('scroll', apply)

    return () => {
      visualViewport.removeEventListener('resize', apply)
      visualViewport.removeEventListener('scroll', apply)
      clear()
      resetWindowScroll()
    }
  }, [enabled, ref])
}
