'use client'

import * as React from 'react'
import { CornerDownLeft, Delete } from 'lucide-react'

import {
  HideKeyboardIcon,
  KeypadButton,
} from '@/components/mobile-keyboard/keypad-surface'
import type { MobileKeyboardMode } from '@/lib/mobile-keyboard/resolve-keyboard-mode'
import { cn } from '@/lib/utils'

const QWERTY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
] as const

const EMAIL_EXTRA_KEYS = ['@', '.', '-', '_'] as const

type MobileKeyboardLayoutProps = {
  mode: MobileKeyboardMode
  multiline?: boolean
  appendChar: (char: string) => void
  backspace: () => void
  closeKeyboard: () => void
}

function NumericGrid({
  mode,
  appendChar,
  backspace,
  closeKeyboard,
}: Omit<MobileKeyboardLayoutProps, 'multiline'>) {
  const showDecimal = mode === 'decimal'

  return (
    <div
      className="box-border grid w-full max-w-full min-w-0 grid-cols-4 gap-1 px-2 pt-2 pb-1 sm:gap-1.5 sm:px-3 sm:pt-2.5 sm:pb-1.5"
      style={{ gridTemplateRows: 'repeat(4, minmax(3rem, auto))' }}
    >
      {['1', '2', '3'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className="h-full min-h-11 sm:min-h-12"
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Backspace"
        variant="icon"
        onClick={backspace}
        className="h-full min-h-11 sm:min-h-12"
      >
        <Delete className="size-5" />
      </KeypadButton>

      {['4', '5', '6'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className="h-full min-h-11 sm:min-h-12"
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Done"
        variant="accent"
        onClick={closeKeyboard}
        className="row-span-3 h-full min-h-[calc(9rem+0.5rem)] text-sm font-bold sm:min-h-[calc(10rem+0.75rem)] sm:text-base"
      >
        Done
      </KeypadButton>

      {['7', '8', '9'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className="h-full min-h-11 sm:min-h-12"
        >
          {digit}
        </KeypadButton>
      ))}

      {showDecimal ? (
        <KeypadButton
          aria-label="Decimal point"
          onClick={() => appendChar('.')}
          className="h-full min-h-11 sm:min-h-12"
        >
          .
        </KeypadButton>
      ) : (
        <div />
      )}
      <KeypadButton
        aria-label="Digit 0"
        onClick={() => appendChar('0')}
        className="h-full min-h-11 sm:min-h-12"
      >
        0
      </KeypadButton>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={closeKeyboard}
        className="h-full min-h-11 sm:min-h-12"
      >
        <HideKeyboardIcon />
      </KeypadButton>
    </div>
  )
}

function TextGrid({
  mode,
  multiline,
  appendChar,
  backspace,
  closeKeyboard,
}: MobileKeyboardLayoutProps) {
  const [shift, setShift] = React.useState(false)
  const extraKeys = mode === 'email' ? EMAIL_EXTRA_KEYS : []

  const handleChar = (char: string) => {
    appendChar(shift ? char.toUpperCase() : char)
    if (shift) setShift(false)
  }

  return (
    <div className="box-border w-full max-w-full min-w-0 space-y-1 px-2 pt-2 pb-1 sm:space-y-1.5 sm:px-3 sm:pt-2.5 sm:pb-1.5">
      {QWERTY_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            'flex justify-center gap-1 sm:gap-1.5',
            rowIndex === 1 && 'px-3 sm:px-4',
            rowIndex === 2 && 'px-6 sm:px-8'
          )}
        >
          {row.map((char) => (
            <KeypadButton
              key={char}
              aria-label={char}
              onClick={() => handleChar(char)}
              className="h-11 min-w-8 flex-1 sm:h-12 sm:min-w-9"
            >
              {shift ? char.toUpperCase() : char}
            </KeypadButton>
          ))}
        </div>
      ))}

      <div className="flex gap-1 sm:gap-1.5">
        <KeypadButton
          aria-label="Shift"
          variant={shift ? 'accent' : 'default'}
          onClick={() => setShift((current) => !current)}
          className="h-11 min-w-12 sm:h-12"
        >
          ⇧
        </KeypadButton>
        {extraKeys.map((char) => (
          <KeypadButton
            key={char}
            aria-label={char}
            onClick={() => appendChar(char)}
            className="h-11 min-w-10 flex-1 sm:h-12"
          >
            {char}
          </KeypadButton>
        ))}
        <KeypadButton
          aria-label="Space"
          onClick={() => appendChar(' ')}
          className="h-11 min-w-0 flex-[2] sm:h-12"
        >
          space
        </KeypadButton>
        <KeypadButton
          aria-label="Backspace"
          variant="icon"
          onClick={backspace}
          className="h-11 min-w-12 sm:h-12"
        >
          <Delete className="size-5" />
        </KeypadButton>
      </div>

      <div className="flex gap-1 sm:gap-1.5">
        {multiline ? (
          <KeypadButton
            aria-label="New line"
            onClick={() => appendChar('\n')}
            className="h-11 min-w-16 sm:h-12"
          >
            <CornerDownLeft className="size-5" />
          </KeypadButton>
        ) : null}
        <KeypadButton
          aria-label="Done"
          variant="accent"
          onClick={closeKeyboard}
          className="h-11 min-w-0 flex-1 text-sm font-bold sm:h-12 sm:text-base"
        >
          Done
        </KeypadButton>
        <KeypadButton
          aria-label="Hide keyboard"
          variant="icon"
          onClick={closeKeyboard}
          className="h-11 min-w-12 sm:h-12"
        >
          <HideKeyboardIcon />
        </KeypadButton>
      </div>
    </div>
  )
}

function TelGrid({
  appendChar,
  backspace,
  closeKeyboard,
}: Omit<MobileKeyboardLayoutProps, 'multiline' | 'mode'>) {
  return (
    <div
      className="box-border grid w-full max-w-full min-w-0 grid-cols-4 gap-1 px-2 pt-2 pb-1 sm:gap-1.5 sm:px-3 sm:pt-2.5 sm:pb-1.5"
      style={{ gridTemplateRows: 'repeat(5, minmax(3rem, auto))' }}
    >
      {['1', '2', '3'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className="h-full min-h-11 sm:min-h-12"
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Backspace"
        variant="icon"
        onClick={backspace}
        className="h-full min-h-11 sm:min-h-12"
      >
        <Delete className="size-5" />
      </KeypadButton>

      {['4', '5', '6'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className="h-full min-h-11 sm:min-h-12"
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Done"
        variant="accent"
        onClick={closeKeyboard}
        className="row-span-3 h-full min-h-[calc(9rem+0.5rem)] text-sm font-bold sm:min-h-[calc(10rem+0.75rem)] sm:text-base"
      >
        Done
      </KeypadButton>

      {['7', '8', '9'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className="h-full min-h-11 sm:min-h-12"
        >
          {digit}
        </KeypadButton>
      ))}

      <KeypadButton
        aria-label="Open parenthesis"
        onClick={() => appendChar('(')}
        className="h-full min-h-11 sm:min-h-12"
      >
        (
      </KeypadButton>
      <KeypadButton
        aria-label="Close parenthesis"
        onClick={() => appendChar(')')}
        className="h-full min-h-11 sm:min-h-12"
      >
        )
      </KeypadButton>
      <KeypadButton
        aria-label="Hyphen"
        onClick={() => appendChar('-')}
        className="h-full min-h-11 sm:min-h-12"
      >
        -
      </KeypadButton>

      <KeypadButton
        aria-label="Plus"
        onClick={() => appendChar('+')}
        className="h-full min-h-11 sm:min-h-12"
      >
        +
      </KeypadButton>
      <KeypadButton
        aria-label="Digit 0"
        onClick={() => appendChar('0')}
        className="h-full min-h-11 sm:min-h-12"
      >
        0
      </KeypadButton>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={closeKeyboard}
        className="h-full min-h-11 sm:min-h-12"
      >
        <HideKeyboardIcon />
      </KeypadButton>
    </div>
  )
}

export function MobileKeyboardLayout(props: MobileKeyboardLayoutProps) {
  if (props.mode === 'tel') {
    return <TelGrid {...props} />
  }

  if (props.mode === 'numeric' || props.mode === 'decimal') {
    return <NumericGrid {...props} />
  }

  return <TextGrid {...props} />
}
