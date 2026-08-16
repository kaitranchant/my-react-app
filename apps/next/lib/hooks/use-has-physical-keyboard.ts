'use client'

import * as React from 'react'

import { isLikelyPhysicalKey } from '@/lib/mobile-keyboard/physical-keyboard'

function subscribeToFinePointer(callback: () => void) {
  const media = window.matchMedia('(any-pointer: fine)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}

function getFinePointerSnapshot() {
  return window.matchMedia('(any-pointer: fine)').matches
}

function getFinePointerServerSnapshot() {
  return false
}

function useAnyFinePointer() {
  return React.useSyncExternalStore(
    subscribeToFinePointer,
    getFinePointerSnapshot,
    getFinePointerServerSnapshot
  )
}

/**
 * True when a hardware keyboard, trackpad, or mouse is available — i.e. the
 * in-app workout keypad should stay off.
 */
export function useHasPhysicalKeyboard() {
  const hasFinePointer = useAnyFinePointer()
  const [typingDetected, setTypingDetected] = React.useState(false)

  React.useEffect(() => {
    let timeoutId = 0

    function onScreenKeyboardOpen() {
      const visualViewport = window.visualViewport
      return (
        visualViewport != null &&
        visualViewport.height < window.innerHeight - 80
      )
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!isLikelyPhysicalKey(event)) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('[data-keyboard-overlay-root]')
      ) {
        return
      }
      if (onScreenKeyboardOpen()) return

      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        if (onScreenKeyboardOpen()) return
        setTypingDetected(true)
      }, 400)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  React.useEffect(() => {
    if (!hasFinePointer) {
      setTypingDetected(false)
    }
  }, [hasFinePointer])

  return hasFinePointer || typingDetected
}
