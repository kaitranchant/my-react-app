'use client'

import * as React from 'react'
import { CornerDownLeft, Delete } from 'lucide-react'

import {
  HideKeyboardIcon,
  KEYPAD_GRID_CLASS,
  KEYPAD_KEY_CLASS,
  KEYPAD_ROW_HEIGHT,
  KeypadButton,
} from '@/components/mobile-keyboard/keypad-surface'
import type { MobileKeyboardMode } from '@/lib/mobile-keyboard/resolve-keyboard-mode'
import { cn } from '@/lib/utils'

const QWERTY_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
] as const

const NUMBER_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['.', ',', '?', '!', "'", '_'],
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
      className={cn(KEYPAD_GRID_CLASS, 'grid-cols-4')}
      style={{ gridTemplateRows: `repeat(4, ${KEYPAD_ROW_HEIGHT})` }}
    >
      {['1', '2', '3'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className={KEYPAD_KEY_CLASS}
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Backspace"
        variant="icon"
        onClick={backspace}
        className={KEYPAD_KEY_CLASS}
      >
        <Delete className="size-5" />
      </KeypadButton>

      {['4', '5', '6'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className={KEYPAD_KEY_CLASS}
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Done"
        variant="accent"
        onClick={closeKeyboard}
        className={cn(
          KEYPAD_KEY_CLASS,
          'row-span-3 text-base font-bold tracking-wide sm:text-lg'
        )}
      >
        Done
      </KeypadButton>

      {['7', '8', '9'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className={KEYPAD_KEY_CLASS}
        >
          {digit}
        </KeypadButton>
      ))}

      {showDecimal ? (
        <KeypadButton
          aria-label="Decimal point"
          onClick={() => appendChar('.')}
          className={KEYPAD_KEY_CLASS}
        >
          .
        </KeypadButton>
      ) : (
        <div aria-hidden className={KEYPAD_KEY_CLASS} />
      )}
      <KeypadButton
        aria-label="Digit 0"
        onClick={() => appendChar('0')}
        className={KEYPAD_KEY_CLASS}
      >
        0
      </KeypadButton>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={closeKeyboard}
        className={KEYPAD_KEY_CLASS}
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
  const [showNumbers, setShowNumbers] = React.useState(false)
  const extraKeys = mode === 'email' ? EMAIL_EXTRA_KEYS : []

  const handleChar = (char: string) => {
    appendChar(shift ? char.toUpperCase() : char)
    if (shift) setShift(false)
  }

  const showLetters = () => {
    setShowNumbers(false)
    setShift(false)
  }

  const showNumberPad = () => {
    setShowNumbers(true)
    setShift(false)
  }

  return (
    <div className={cn(KEYPAD_GRID_CLASS, 'space-y-1.5 sm:space-y-2')}>
      {showNumbers
        ? NUMBER_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                'flex justify-center gap-1.5 sm:gap-2',
                rowIndex === 2 && 'px-5 sm:px-7'
              )}
            >
              {row.map((char) => (
                <KeypadButton
                  key={char}
                  aria-label={char}
                  onClick={() => appendChar(char)}
                  className="h-12 min-h-12 min-w-9 flex-1 sm:h-[3.25rem] sm:min-w-10"
                >
                  {char}
                </KeypadButton>
              ))}
            </div>
          ))
        : QWERTY_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                'flex justify-center gap-1.5 sm:gap-2',
                rowIndex === 1 && 'px-2 sm:px-3',
                rowIndex === 2 && 'px-5 sm:px-7'
              )}
            >
              {row.map((char) => (
                <KeypadButton
                  key={char}
                  aria-label={char}
                  onClick={() => handleChar(char)}
                  className="h-12 min-h-12 min-w-9 flex-1 sm:h-[3.25rem] sm:min-w-10"
                >
                  {shift ? char.toUpperCase() : char}
                </KeypadButton>
              ))}
            </div>
          ))}

      <div className="flex gap-1.5 sm:gap-2">
        <KeypadButton
          aria-label={showNumbers ? 'Letters' : 'Numbers'}
          onClick={showNumbers ? showLetters : showNumberPad}
          className="h-12 min-h-12 min-w-14 text-sm sm:h-[3.25rem]"
        >
          {showNumbers ? 'ABC' : '123'}
        </KeypadButton>
        {!showNumbers ? (
          <KeypadButton
            aria-label="Shift"
            variant={shift ? 'accent' : 'default'}
            onClick={() => setShift((current) => !current)}
            className="h-12 min-h-12 min-w-14 sm:h-[3.25rem]"
          >
            ⇧
          </KeypadButton>
        ) : null}
        {!showNumbers
          ? extraKeys.map((char) => (
              <KeypadButton
                key={char}
                aria-label={char}
                onClick={() => appendChar(char)}
                className="h-12 min-h-12 min-w-10 flex-1 sm:h-[3.25rem]"
              >
                {char}
              </KeypadButton>
            ))
          : null}
        <KeypadButton
          aria-label="Space"
          onClick={() => appendChar(' ')}
          className="h-12 min-h-12 min-w-0 flex-[2] sm:h-[3.25rem]"
        >
          space
        </KeypadButton>
        <KeypadButton
          aria-label="Backspace"
          variant="icon"
          onClick={backspace}
          className="h-12 min-h-12 min-w-14 sm:h-[3.25rem]"
        >
          <Delete className="size-5" />
        </KeypadButton>
      </div>

      <div className="flex gap-1.5 sm:gap-2">
        {multiline ? (
          <KeypadButton
            aria-label="New line"
            onClick={() => appendChar('\n')}
            className="h-12 min-h-12 min-w-16 sm:h-[3.25rem]"
          >
            <CornerDownLeft className="size-5" />
          </KeypadButton>
        ) : null}
        <KeypadButton
          aria-label="Done"
          variant="accent"
          onClick={closeKeyboard}
          className="h-12 min-h-12 min-w-0 flex-1 text-base font-bold sm:h-[3.25rem] sm:text-lg"
        >
          Done
        </KeypadButton>
        <KeypadButton
          aria-label="Hide keyboard"
          variant="icon"
          onClick={closeKeyboard}
          className="h-12 min-h-12 min-w-14 sm:h-[3.25rem]"
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
      className={cn(KEYPAD_GRID_CLASS, 'grid-cols-4')}
      style={{ gridTemplateRows: `repeat(5, ${KEYPAD_ROW_HEIGHT})` }}
    >
      {['1', '2', '3'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className={KEYPAD_KEY_CLASS}
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Backspace"
        variant="icon"
        onClick={backspace}
        className={KEYPAD_KEY_CLASS}
      >
        <Delete className="size-5" />
      </KeypadButton>

      {['4', '5', '6'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className={KEYPAD_KEY_CLASS}
        >
          {digit}
        </KeypadButton>
      ))}
      <KeypadButton
        aria-label="Done"
        variant="accent"
        onClick={closeKeyboard}
        className={cn(
          KEYPAD_KEY_CLASS,
          'row-span-3 text-base font-bold tracking-wide sm:text-lg'
        )}
      >
        Done
      </KeypadButton>

      {['7', '8', '9'].map((digit) => (
        <KeypadButton
          key={digit}
          aria-label={`Digit ${digit}`}
          onClick={() => appendChar(digit)}
          className={KEYPAD_KEY_CLASS}
        >
          {digit}
        </KeypadButton>
      ))}

      <KeypadButton
        aria-label="Open parenthesis"
        onClick={() => appendChar('(')}
        className={KEYPAD_KEY_CLASS}
      >
        (
      </KeypadButton>
      <KeypadButton
        aria-label="Close parenthesis"
        onClick={() => appendChar(')')}
        className={KEYPAD_KEY_CLASS}
      >
        )
      </KeypadButton>
      <KeypadButton
        aria-label="Hyphen"
        onClick={() => appendChar('-')}
        className={KEYPAD_KEY_CLASS}
      >
        -
      </KeypadButton>

      <KeypadButton
        aria-label="Plus"
        onClick={() => appendChar('+')}
        className={KEYPAD_KEY_CLASS}
      >
        +
      </KeypadButton>
      <KeypadButton
        aria-label="Digit 0"
        onClick={() => appendChar('0')}
        className={KEYPAD_KEY_CLASS}
      >
        0
      </KeypadButton>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={closeKeyboard}
        className={KEYPAD_KEY_CLASS}
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
