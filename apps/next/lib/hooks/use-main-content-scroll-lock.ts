'use client'

import { useEffect } from 'react'

import {
  burstStabilizeViewportScroll,
  resetWindowScroll,
} from '@/lib/visual-viewport/app-viewport'

/** Pins #main-content scroll while a full-screen overlay is open (e.g. viewport dialog). */
export function useMainContentScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const main = document.getElementById('main-content')
    if (!main) return

    const pinnedScrollTop = main.scrollTop
    const previousOverflow = main.style.overflow
    const previousOverscrollBehavior = main.style.overscrollBehavior
    const previousTouchAction = main.style.touchAction

    main.style.overflow = 'hidden'
    main.style.overscrollBehavior = 'none'
    main.style.touchAction = 'none'

    const pinScroll = () => {
      if (main.scrollTop !== pinnedScrollTop) {
        main.scrollTop = pinnedScrollTop
      }
    }

    const onViewportChange = () => {
      resetWindowScroll()
      pinScroll()
    }

    const onFocusIn = () => {
      burstStabilizeViewportScroll(400)
      pinScroll()
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        burstStabilizeViewportScroll(350)
        pinScroll()
      }, 100)
    }

    main.addEventListener('scroll', pinScroll, { passive: true })
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)

    return () => {
      main.removeEventListener('scroll', pinScroll)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      main.style.overflow = previousOverflow
      main.style.overscrollBehavior = previousOverscrollBehavior
      main.style.touchAction = previousTouchAction

      burstStabilizeViewportScroll(200)
      const maxScroll = Math.max(0, main.scrollHeight - main.clientHeight)
      main.scrollTop = Math.min(pinnedScrollTop, maxScroll)
    }
  }, [enabled])
}
