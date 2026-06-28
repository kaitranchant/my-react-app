'use client'

import { useEffect } from 'react'

function resetWindowScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/** Pins #main-content scroll while a full-screen overlay is open (e.g. viewport dialog). */
export function useMainContentScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const main = document.getElementById('main-content')
    if (!main) return

    let pinnedScrollTop = main.scrollTop
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

    const onFocusOut = () => {
      window.setTimeout(() => {
        resetWindowScroll()
        pinScroll()
      }, 150)
    }

    main.addEventListener('scroll', pinScroll, { passive: true })
    window.visualViewport?.addEventListener('resize', onViewportChange)
    window.visualViewport?.addEventListener('scroll', onViewportChange)
    document.body.addEventListener('focusout', onFocusOut, true)

    return () => {
      main.removeEventListener('scroll', pinScroll)
      window.visualViewport?.removeEventListener('resize', onViewportChange)
      window.visualViewport?.removeEventListener('scroll', onViewportChange)
      document.body.removeEventListener('focusout', onFocusOut, true)
      main.style.overflow = previousOverflow
      main.style.overscrollBehavior = previousOverscrollBehavior
      main.style.touchAction = previousTouchAction

      resetWindowScroll()
      const maxScroll = Math.max(0, main.scrollHeight - main.clientHeight)
      main.scrollTop = Math.min(pinnedScrollTop, maxScroll)
    }
  }, [enabled])
}
