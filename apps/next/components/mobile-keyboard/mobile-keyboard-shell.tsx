'use client'

import * as React from 'react'

import { MobileKeyboardProvider } from '@/components/mobile-keyboard/mobile-keyboard-context'
import { MobileKeyboardOverlay } from '@/components/mobile-keyboard/mobile-keyboard'
import { usePreferMobileKeyboard } from '@/lib/hooks/use-prefer-mobile-keyboard'

type MobileKeyboardShellProps = {
  enabled?: boolean
  children: React.ReactNode
}

export function MobileKeyboardShell({
  enabled = true,
  children,
}: MobileKeyboardShellProps) {
  const preferMobileKeyboard = usePreferMobileKeyboard()
  const useCustomKeyboard = enabled && preferMobileKeyboard

  return (
    <MobileKeyboardProvider enabled={useCustomKeyboard}>
      {children}
      {useCustomKeyboard ? <MobileKeyboardOverlay /> : null}
    </MobileKeyboardProvider>
  )
}
