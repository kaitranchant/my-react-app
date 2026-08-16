'use client'

import * as React from 'react'

import { useCoarsePointer } from '@/lib/hooks/use-coarse-pointer'
import { useHasPhysicalKeyboard } from '@/lib/hooks/use-has-physical-keyboard'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { useTabletTouchLayout } from '@/lib/hooks/use-tablet-touch-layout'

function isIosLikeTouchDevice() {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isAndroidTouchTablet() {
  if (typeof navigator === 'undefined') return false
  return (
    /Android/i.test(navigator.userAgent) &&
    navigator.maxTouchPoints > 0 &&
    window.matchMedia('(min-width: 768px)').matches
  )
}

/**
 * True on phones, iPads, and other touch-first layouts that do not have a
 * mouse, trackpad, or detected hardware keyboard.
 */
export function useTouchFirstWithoutPhysicalKeyboard() {
  const isMobile = useIsMobile()
  const tabletTouch = useTabletTouchLayout()
  const coarsePointer = useCoarsePointer()
  const hasPhysicalKeyboard = useHasPhysicalKeyboard()
  const [touchTablet, setTouchTablet] = React.useState(false)

  React.useEffect(() => {
    const update = () => {
      setTouchTablet(isIosLikeTouchDevice() || isAndroidTouchTablet())
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const touchFirstLayout =
    isMobile || tabletTouch || coarsePointer || touchTablet

  return touchFirstLayout && !hasPhysicalKeyboard
}
