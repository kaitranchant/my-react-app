'use client'

import * as React from 'react'
import { Copy, Delete, Layers } from 'lucide-react'

import {
  HideKeyboardIcon,
  KeypadButton,
  KeypadReserve,
  KeypadSurfaceOverlay,
} from '@/components/mobile-keyboard/keypad-surface'
import type { ActiveKeypadTarget } from '@/lib/workout-log-keypad'

import { PlateCalculatorPanel } from './plate-calculator-sheet'
import {
  getWeightStepLabel,
  useWorkoutLogKeypad,
} from './workout-log-keypad-context'

function WorkoutLogKeypadContent({
  activeTarget,
  weightUnit,
  appendDigit,
  backspace,
  adjustWeight,
  copyPrevious,
  goNext,
  closeKeypad,
  openPlateSheet,
}: {
  activeTarget: ActiveKeypadTarget
  weightUnit: 'lbs' | 'kg'
  appendDigit: (digit: string) => void
  backspace: () => void
  adjustWeight: (delta: number) => void
  copyPrevious: () => void
  goNext: () => void
  closeKeypad: () => void
  openPlateSheet: () => void
}) {
  if (!activeTarget) return null

  const isWeightField = activeTarget.field === 'weight'
  const increment = getWeightStepLabel(weightUnit, '+')
  const decrement = getWeightStepLabel(weightUnit, '-')

  return (
    <div
      className="box-border grid w-full max-w-full min-w-0 grid-cols-5 gap-1 px-2 pt-2 pb-1 sm:gap-1.5 sm:px-3 sm:pt-2.5 sm:pb-1.5"
      style={{
        gridTemplateRows: 'repeat(4, minmax(3rem, auto))',
      }}
    >
      <KeypadButton
        aria-label={`Add ${increment.replace('+', '')} ${weightUnit}`}
        disabled={!isWeightField}
        onClick={() => adjustWeight(getWeightIncrementValue(weightUnit))}
        className="h-full min-h-11 text-xs sm:min-h-12 sm:text-sm"
      >
        {increment}
      </KeypadButton>
      <KeypadButton aria-label="Digit 1" onClick={() => appendDigit('1')} className="h-full">
        1
      </KeypadButton>
      <KeypadButton aria-label="Digit 2" onClick={() => appendDigit('2')} className="h-full">
        2
      </KeypadButton>
      <KeypadButton aria-label="Digit 3" onClick={() => appendDigit('3')} className="h-full">
        3
      </KeypadButton>
      <KeypadButton
        aria-label="Copy previous set"
        variant="icon"
        onClick={copyPrevious}
        className="h-full min-h-11 sm:min-h-12"
      >
        <Copy className="size-5" />
      </KeypadButton>

      <KeypadButton
        aria-label={`Subtract ${decrement.replace('-', '')} ${weightUnit}`}
        disabled={!isWeightField}
        onClick={() => adjustWeight(-getWeightIncrementValue(weightUnit))}
        className="h-full min-h-11 text-xs sm:min-h-12 sm:text-sm"
      >
        {decrement}
      </KeypadButton>
      <KeypadButton aria-label="Digit 4" onClick={() => appendDigit('4')} className="h-full">
        4
      </KeypadButton>
      <KeypadButton aria-label="Digit 5" onClick={() => appendDigit('5')} className="h-full">
        5
      </KeypadButton>
      <KeypadButton aria-label="Digit 6" onClick={() => appendDigit('6')} className="h-full">
        6
      </KeypadButton>
      <KeypadButton
        aria-label="Next field"
        variant="accent"
        onClick={goNext}
        className="row-span-2 h-full min-h-[calc(6rem+0.25rem)] text-sm font-bold sm:min-h-[calc(6.75rem+0.375rem)] sm:text-base"
      >
        NEXT
      </KeypadButton>

      <KeypadButton
        aria-label="Plate calculator"
        variant="icon"
        disabled={!isWeightField}
        onClick={openPlateSheet}
        className="h-full min-h-11 sm:min-h-12"
      >
        <Layers className="size-5" />
      </KeypadButton>
      <KeypadButton aria-label="Digit 7" onClick={() => appendDigit('7')} className="h-full">
        7
      </KeypadButton>
      <KeypadButton aria-label="Digit 8" onClick={() => appendDigit('8')} className="h-full">
        8
      </KeypadButton>
      <KeypadButton aria-label="Digit 9" onClick={() => appendDigit('9')} className="h-full">
        9
      </KeypadButton>

      <div />
      <KeypadButton aria-label="Decimal point" onClick={() => appendDigit('.')} className="h-full">
        .
      </KeypadButton>
      <KeypadButton aria-label="Digit 0" onClick={() => appendDigit('0')} className="h-full">
        0
      </KeypadButton>
      <KeypadButton aria-label="Backspace" variant="icon" onClick={backspace} className="h-full min-h-11 sm:min-h-12">
        <Delete className="size-5" />
      </KeypadButton>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={closeKeypad}
        className="h-full min-h-11 sm:min-h-12"
      >
        <HideKeyboardIcon />
      </KeypadButton>
    </div>
  )
}

function WorkoutLogKeypadOverlay() {
  const keypad = useWorkoutLogKeypad()
  const isOpen = Boolean(keypad?.enabled && keypad.activeTarget)
  const activeTargetRef = React.useRef(keypad?.activeTarget ?? null)
  if (keypad?.activeTarget) {
    activeTargetRef.current = keypad.activeTarget
  }

  const setReserveHeight = React.useCallback(
    (height: number) => {
      keypad?.setKeypadReserveHeight(height)
    },
    [keypad]
  )

  const plateSheetOpen = keypad?.plateSheetOpen ?? false

  if (!keypad?.enabled) {
    return null
  }

  const activeTarget = keypad.activeTarget ?? activeTargetRef.current

  return (
    <KeypadSurfaceOverlay
      enabled={keypad.enabled}
      isOpen={isOpen}
      ariaLabel="Workout entry keypad"
      reserveHeight={keypad.keypadReserveHeight}
      onReserveHeightChange={setReserveHeight}
      header={
        plateSheetOpen && activeTarget ? (
          <PlateCalculatorPanel onClose={keypad.closePlateSheet} />
        ) : undefined
      }
    >
      {activeTarget ? (
        <WorkoutLogKeypadContent
          activeTarget={activeTarget}
          weightUnit={keypad.weightUnit}
          appendDigit={keypad.appendDigit}
          backspace={keypad.backspace}
          adjustWeight={keypad.adjustWeight}
          copyPrevious={keypad.copyPrevious}
          goNext={keypad.goNext}
          closeKeypad={keypad.closeKeypad}
          openPlateSheet={keypad.openPlateSheet}
        />
      ) : null}
    </KeypadSurfaceOverlay>
  )
}

function WorkoutLogKeypadReserve() {
  const keypad = useWorkoutLogKeypad()

  return (
    <KeypadReserve
      enabled={Boolean(keypad?.enabled)}
      reserveHeight={keypad?.keypadReserveHeight ?? 0}
    />
  )
}

export function WorkoutLogKeypad() {
  return (
    <>
      <WorkoutLogKeypadReserve />
      <WorkoutLogKeypadOverlay />
    </>
  )
}

function getWeightIncrementValue(unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? 1.25 : 2.5
}
