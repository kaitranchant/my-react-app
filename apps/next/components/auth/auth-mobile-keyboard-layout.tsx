'use client'

import * as React from 'react'

import { MobileKeyboardReserve } from '@/components/mobile-keyboard/mobile-keyboard'
import { MobileKeyboardShell } from '@/components/mobile-keyboard/mobile-keyboard-shell'

export function AuthMobileKeyboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MobileKeyboardShell>
      <div className="w-full max-w-sm">
        {children}
        <MobileKeyboardReserve />
      </div>
    </MobileKeyboardShell>
  )
}
