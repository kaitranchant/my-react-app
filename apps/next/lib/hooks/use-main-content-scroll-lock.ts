'use client'

import { useEffect } from 'react'

import { resetWindowScroll } from '@/lib/visual-viewport/app-viewport'
import { installMainContentFreeze } from '@/lib/visual-viewport/freeze-main-content'

/** Pins #main-content scroll while a full-screen overlay is open (e.g. viewport dialog). */
export function useMainContentScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    resetWindowScroll()
    const releaseMain = installMainContentFreeze()

    return () => {
      releaseMain()
      resetWindowScroll()
    }
  }, [enabled])
}
