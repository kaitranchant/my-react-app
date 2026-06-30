'use client'

import * as React from 'react'
import {
  Copy,
  Delete,
  Keyboard,
  Layers,
} from 'lucide-react'

import { cn } from '@/lib/utils'

import {
  getWeightStepLabel,
  useWorkoutLogKeypad,
} from './workout-log-keypad-context'

function KeypadButton({
  children,
  className,
  variant = 'default',
  onClick,
  'aria-label': ariaLabel,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent' | 'icon'
  onClick: () => void
  'aria-label': string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-xl text-base font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40',
        variant === 'accent' &&
          'bg-brand text-brand-foreground hover:bg-brand/90',
        variant === 'icon' &&
          'bg-muted/80 text-foreground hover:bg-muted',
        variant === 'default' &&
          'bg-muted/80 text-foreground hover:bg-muted',
        className
      )}
    >
      {children}
    </button>
  )
}

export function WorkoutLogKeypad() {
  const keypad = useWorkoutLogKeypad()

  if (!keypad?.enabled || !keypad.activeTarget) {
    return null
  }

  const {
    weightUnit,
    activeTarget,
    appendDigit,
    backspace,
    adjustWeight,
    copyPrevious,
    goNext,
    closeKeypad,
    openPlateSheet,
  } = keypad

  const isWeightField = activeTarget.field === 'weight'
  const increment = getWeightStepLabel(weightUnit, '+')
  const decrement = getWeightStepLabel(weightUnit, '-')

  return (
    <div
      role="group"
      aria-label="Workout entry keypad"
      className="bg-card shrink-0 border-t px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="mx-auto grid max-w-lg gap-1.5"
        style={{
          gridTemplateColumns: 'minmax(0, 1fr) repeat(3, minmax(0, 1fr)) minmax(0, 1fr)',
          gridTemplateRows: 'repeat(4, minmax(2.75rem, auto))',
        }}
      >
        <KeypadButton
          aria-label={`Add ${increment.replace('+', '')} ${weightUnit}`}
          disabled={!isWeightField}
          onClick={() => adjustWeight(getWeightIncrementValue(weightUnit))}
          className="h-full min-h-11"
        >
          {increment}
        </KeypadButton>
        <KeypadButton aria-label="Digit 1" onClick={() => appendDigit('1')}>
          1
        </KeypadButton>
        <KeypadButton aria-label="Digit 2" onClick={() => appendDigit('2')}>
          2
        </KeypadButton>
        <KeypadButton aria-label="Digit 3" onClick={() => appendDigit('3')}>
          3
        </KeypadButton>
        <KeypadButton
          aria-label="Copy previous set"
          variant="icon"
          onClick={copyPrevious}
          className="h-full min-h-11"
        >
          <Copy className="size-5" />
        </KeypadButton>

        <KeypadButton
          aria-label={`Subtract ${decrement.replace('-', '')} ${weightUnit}`}
          disabled={!isWeightField}
          onClick={() => adjustWeight(-getWeightIncrementValue(weightUnit))}
          className="h-full min-h-11"
        >
          {decrement}
        </KeypadButton>
        <KeypadButton aria-label="Digit 4" onClick={() => appendDigit('4')}>
          4
        </KeypadButton>
        <KeypadButton aria-label="Digit 5" onClick={() => appendDigit('5')}>
          5
        </KeypadButton>
        <KeypadButton aria-label="Digit 6" onClick={() => appendDigit('6')}>
          6
        </KeypadButton>
        <KeypadButton
          aria-label="Next field"
          variant="accent"
          onClick={goNext}
          className="row-span-2 h-full min-h-[calc(5.5rem+0.375rem)] text-lg font-bold"
        >
          NEXT
        </KeypadButton>

        <KeypadButton
          aria-label="Plate calculator"
          variant="icon"
          disabled={!isWeightField}
          onClick={openPlateSheet}
          className="h-full min-h-11"
        >
          <Layers className="size-5" />
        </KeypadButton>
        <KeypadButton aria-label="Digit 7" onClick={() => appendDigit('7')}>
          7
        </KeypadButton>
        <KeypadButton aria-label="Digit 8" onClick={() => appendDigit('8')}>
          8
        </KeypadButton>
        <KeypadButton aria-label="Digit 9" onClick={() => appendDigit('9')}>
          9
        </KeypadButton>

        <div />
        <KeypadButton aria-label="Decimal point" onClick={() => appendDigit('.')}>
          .
        </KeypadButton>
        <KeypadButton aria-label="Digit 0" onClick={() => appendDigit('0')}>
          0
        </KeypadButton>
        <KeypadButton aria-label="Backspace" variant="icon" onClick={backspace}>
          <Delete className="size-5" />
        </KeypadButton>
        <KeypadButton
          aria-label="Hide keyboard"
          variant="icon"
          onClick={closeKeypad}
          className="h-full min-h-11"
        >
          <Keyboard className="size-5" />
        </KeypadButton>
      </div>
    </div>
  )
}

function getWeightIncrementValue(unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? 1.25 : 2.5
}
