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

const KEYPAD_ANIMATION_MS = 300

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
        'flex min-w-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 sm:rounded-xl sm:text-base',
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
  const isOpen = Boolean(keypad?.enabled && keypad.activeTarget)
  const activeTargetRef = React.useRef(keypad?.activeTarget ?? null)
  if (keypad?.activeTarget) {
    activeTargetRef.current = keypad.activeTarget
  }

  const [expanded, setExpanded] = React.useState(isOpen)
  const [renderContent, setRenderContent] = React.useState(isOpen)

  React.useEffect(() => {
    if (isOpen) {
      setRenderContent(true)
      const frame = requestAnimationFrame(() => setExpanded(true))
      return () => cancelAnimationFrame(frame)
    }

    setExpanded(false)
    const timer = window.setTimeout(() => setRenderContent(false), KEYPAD_ANIMATION_MS)
    return () => window.clearTimeout(timer)
  }, [isOpen])

  if (!keypad?.enabled || !renderContent) {
    return null
  }

  const activeTarget = keypad.activeTarget ?? activeTargetRef.current
  if (!activeTarget) {
    return null
  }

  const {
    weightUnit,
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
      className={cn(
        'grid w-full shrink-0 overflow-hidden transition-[grid-template-rows] duration-300 ease-out',
        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          role="group"
          aria-label="Workout entry keypad"
          aria-hidden={!isOpen}
          className={cn(
            'bg-card w-full min-w-0 border-t px-[max(0.5rem,env(safe-area-inset-left))] pt-2 pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-out',
            expanded ? 'translate-y-0' : 'translate-y-full',
            !isOpen && 'pointer-events-none'
          )}
        >
          <div
            className="grid w-full min-w-0 gap-1 sm:gap-1.5"
            style={{
              gridTemplateColumns:
                'minmax(0, 1fr) repeat(3, minmax(0, 1fr)) minmax(0, 1fr)',
              gridTemplateRows: 'repeat(4, minmax(2.5rem, auto))',
            }}
          >
        <KeypadButton
          aria-label={`Add ${increment.replace('+', '')} ${weightUnit}`}
          disabled={!isWeightField}
          onClick={() => adjustWeight(getWeightIncrementValue(weightUnit))}
          className="h-full min-h-10 text-xs sm:min-h-11 sm:text-sm"
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
          className="h-full min-h-10 text-xs sm:min-h-11 sm:text-sm"
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
          className="row-span-2 h-full min-h-[calc(5rem+0.25rem)] text-sm font-bold sm:min-h-[calc(5.5rem+0.375rem)] sm:text-base"
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
      </div>
    </div>
  )
}

function getWeightIncrementValue(unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? 1.25 : 2.5
}
