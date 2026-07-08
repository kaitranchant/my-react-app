'use client'

import * as React from 'react'

import { MobileKeyboardLayout } from '@/components/mobile-keyboard/mobile-keyboard-layouts'
import {
  KeypadReserve,
  KeypadSurfaceOverlay,
} from '@/components/mobile-keyboard/keypad-surface'
import { useMobileKeyboard } from '@/components/mobile-keyboard/mobile-keyboard-context'
import { MobileKeyboardPreview } from '@/components/mobile-keyboard/mobile-keyboard-preview'

function MobileKeyboardReserve() {
  const keyboard = useMobileKeyboard()

  return (
    <KeypadReserve
      enabled={Boolean(keyboard?.enabled)}
      reserveHeight={keyboard?.keypadReserveHeight ?? 0}
    />
  )
}

export function MobileKeyboardOverlay() {
  const keyboard = useMobileKeyboard()
  const isOpen = Boolean(keyboard?.enabled && keyboard.activeField)
  const activeFieldRef = React.useRef(keyboard?.activeField ?? null)
  if (keyboard?.activeField) {
    activeFieldRef.current = keyboard.activeField
  }

  const keyboardRef = React.useRef(keyboard)
  keyboardRef.current = keyboard

  const setReserveHeight = React.useCallback((height: number) => {
    keyboardRef.current?.setKeypadReserveHeight(height)
  }, [])

  if (!keyboard?.enabled) {
    return null
  }

  const activeField = keyboard.activeField ?? activeFieldRef.current

  return (
    <KeypadSurfaceOverlay
      enabled={keyboard.enabled}
      isOpen={isOpen}
      ariaLabel="Mobile entry keyboard"
      reserveHeight={keyboard.keypadReserveHeight}
      onReserveHeightChange={setReserveHeight}
    >
      {activeField ? (
        <>
          <MobileKeyboardPreview
            value={keyboard.activeValue}
            kind={activeField.kind}
            onClose={keyboard.closeKeyboard}
          />
          <MobileKeyboardLayout
            mode={activeField.mode}
            multiline={activeField.multiline}
            appendChar={keyboard.appendChar}
            backspace={keyboard.backspace}
            closeKeyboard={keyboard.closeKeyboard}
          />
        </>
      ) : null}
    </KeypadSurfaceOverlay>
  )
}

export { MobileKeyboardReserve }

export function MobileKeyboard() {
  return (
    <>
      <MobileKeyboardReserve />
      <MobileKeyboardOverlay />
    </>
  )
}
