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
 * in-app mobile keyboard should stay hidden so native inputs can be used.
 */
export function useHasPhysicalKeyboard() {
  const hasFinePointer = useAnyFinePointer()
  const [typingDetected, setTypingDetected] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isLikelyPhysicalKey(event)) {
        setTypingDetected(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!hasFinePointer) {
      setTypingDetected(false)
    }
  }, [hasFinePointer])

  return hasFinePointer || typingDetected
}
