'use client'

import { useEffect } from 'react'

/** Prevents the dashboard/portal main pane from scrolling behind open overlays. */
export function useAppMainScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const main = document.getElementById('main-content')
    if (!main) return

    const previousOverflow = main.style.overflow
    const previousOverscrollBehavior = main.style.overscrollBehavior
    const previousTouchAction = main.style.touchAction

    main.style.overflow = 'hidden'
    main.style.overscrollBehavior = 'none'
    main.style.touchAction = 'none'

    return () => {
      main.style.overflow = previousOverflow
      main.style.overscrollBehavior = previousOverscrollBehavior
      main.style.touchAction = previousTouchAction
    }
  }, [enabled])
}
