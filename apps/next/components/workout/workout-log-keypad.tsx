'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Copy, Delete, Layers } from 'lucide-react'

import {
  HideKeyboardIcon,
  KEYPAD_GRID_CLASS,
  KEYPAD_KEY_CLASS,
  KEYPAD_ROW_HEIGHT,
  KeypadButton,
  KeypadReserve,
  KeypadSurfaceOverlay,
} from '@/components/mobile-keyboard/keypad-surface'
import {
  fieldAllowsDecimal,
  getKeypadFieldLabel,
  type ActiveKeypadTarget,
} from '@/lib/workout-log-keypad'
import { cn } from '@/lib/utils'

import { PlateCalculatorPanel } from './plate-calculator-sheet'
import {
  getWeightStepLabel,
  useWorkoutLogKeypad,
} from './workout-log-keypad-context'

function WorkoutKeypadHeader({
  activeTarget,
  activeValue,
  weightUnit,
  setCount,
  onClose,
}: {
  activeTarget: ActiveKeypadTarget
  activeValue: string
  weightUnit: 'lbs' | 'kg'
  setCount: number
  onClose: () => void
}) {
  const fieldLabel = getKeypadFieldLabel(activeTarget.field)
  const unitSuffix =
    activeTarget.field === 'weight'
      ? ` (${weightUnit})`
      : activeTarget.field === 'distanceMeters'
        ? ' (m)'
        : activeTarget.field === 'durationSeconds'
          ? ' (sec)'
          : ''

  return (
    <div className="flex items-center gap-2 border-b px-3 py-2 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium">
          Set {activeTarget.setNumber}
          {setCount > 0 ? ` of ${setCount}` : ''}
          {' · '}
          {fieldLabel}
          {unitSuffix}
        </p>
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">
          {activeValue || '—'}
        </p>
      </div>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={onClose}
        className="size-11 shrink-0 sm:size-12"
      >
        <HideKeyboardIcon />
      </KeypadButton>
    </div>
  )
}

function WorkoutSetNavBar({
  setNumber,
  setCount,
  canGoPreviousSet,
  canGoNextSet,
  onPreviousSet,
  onNextSet,
}: {
  setNumber: number
  setCount: number
  canGoPreviousSet: boolean
  canGoNextSet: boolean
  onPreviousSet: () => void
  onNextSet: () => void
}) {
  if (setCount <= 1) return null

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1.5 sm:px-3">
      <KeypadButton
        aria-label="Previous set"
        variant="icon"
        disabled={!canGoPreviousSet}
        onClick={onPreviousSet}
        className="h-9 min-h-9 flex-1 sm:h-10 sm:min-h-10"
      >
        <ChevronLeft className="size-5" />
        <span className="text-xs font-medium">Set</span>
      </KeypadButton>
      <span className="text-muted-foreground shrink-0 px-1 text-xs font-medium tabular-nums">
        {setNumber} / {setCount}
      </span>
      <KeypadButton
        aria-label="Next set"
        variant="icon"
        disabled={!canGoNextSet}
        onClick={onNextSet}
        className="h-9 min-h-9 flex-1 sm:h-10 sm:min-h-10"
      >
        <span className="text-xs font-medium">Set</span>
        <ChevronRight className="size-5" />
      </KeypadButton>
    </div>
  )
}

function WorkoutLogKeypadContent({
  activeTarget,
  activeValue,
  setCount,
  weightUnit,
  appendDigit,
  backspace,
  adjustWeight,
  copyPrevious,
  goNext,
  goPreviousSet,
  goNextSet,
  canGoPreviousSet,
  canGoNextSet,
  closeKeypad,
  openPlateSheet,
}: {
  activeTarget: ActiveKeypadTarget
  activeValue: string
  setCount: number
  weightUnit: 'lbs' | 'kg'
  appendDigit: (digit: string) => void
  backspace: () => void
  adjustWeight: (delta: number) => void
  copyPrevious: () => void
  goNext: () => void
  goPreviousSet: () => void
  goNextSet: () => void
  canGoPreviousSet: boolean
  canGoNextSet: boolean
  closeKeypad: () => void
  openPlateSheet: () => void
}) {
  const isWeightField = activeTarget.field === 'weight'
  const showDecimal = fieldAllowsDecimal(activeTarget.field)
  const increment = getWeightStepLabel(weightUnit, '+')
  const decrement = getWeightStepLabel(weightUnit, '-')
  const weightStep = getWeightIncrementValue(weightUnit)

  const digitButton = (digit: string) => (
    <KeypadButton
      key={digit}
      aria-label={`Digit ${digit}`}
      onClick={() => appendDigit(digit)}
      className={KEYPAD_KEY_CLASS}
    >
      {digit}
    </KeypadButton>
  )

  return (
    <>
      <WorkoutKeypadHeader
        activeTarget={activeTarget}
        activeValue={activeValue}
        weightUnit={weightUnit}
        setCount={setCount}
        onClose={closeKeypad}
      />
      <WorkoutSetNavBar
        setNumber={activeTarget.setNumber}
        setCount={setCount}
        canGoPreviousSet={canGoPreviousSet}
        canGoNextSet={canGoNextSet}
        onPreviousSet={goPreviousSet}
        onNextSet={goNextSet}
      />
      <div
        className={cn(KEYPAD_GRID_CLASS, 'grid-cols-5')}
        style={{ gridTemplateRows: `repeat(4, ${KEYPAD_ROW_HEIGHT})` }}
      >
        <KeypadButton
          aria-label={`Add ${increment.replace('+', '')} ${weightUnit}`}
          disabled={!isWeightField}
          onClick={() => adjustWeight(weightStep)}
          className={cn(KEYPAD_KEY_CLASS, 'text-xs sm:text-sm')}
        >
          {increment}
        </KeypadButton>
        {digitButton('1')}
        {digitButton('2')}
        {digitButton('3')}
        <KeypadButton
          aria-label="Next field"
          variant="accent"
          onClick={goNext}
          className={cn(
            KEYPAD_KEY_CLASS,
            'row-span-3 text-base font-bold tracking-wide sm:text-lg'
          )}
        >
          NEXT
        </KeypadButton>

        <KeypadButton
          aria-label={`Subtract ${decrement.replace('-', '')} ${weightUnit}`}
          disabled={!isWeightField}
          onClick={() => adjustWeight(-weightStep)}
          className={cn(KEYPAD_KEY_CLASS, 'text-xs sm:text-sm')}
        >
          {decrement}
        </KeypadButton>
        {digitButton('4')}
        {digitButton('5')}
        {digitButton('6')}

        <KeypadButton
          aria-label="Copy previous set"
          variant="icon"
          onClick={copyPrevious}
          className={KEYPAD_KEY_CLASS}
        >
          <Copy className="size-5" />
        </KeypadButton>
        {digitButton('7')}
        {digitButton('8')}
        {digitButton('9')}

        <KeypadButton
          aria-label="Plate calculator"
          variant="icon"
          disabled={!isWeightField}
          onClick={openPlateSheet}
          className={KEYPAD_KEY_CLASS}
        >
          <Layers className="size-5" />
        </KeypadButton>
        <KeypadButton
          aria-label="Backspace"
          variant="icon"
          onClick={backspace}
          className={KEYPAD_KEY_CLASS}
        >
          <Delete className="size-5" />
        </KeypadButton>
        {showDecimal ? (
          <KeypadButton
            aria-label="Decimal point"
            onClick={() => appendDigit('.')}
            className={KEYPAD_KEY_CLASS}
          >
            .
          </KeypadButton>
        ) : (
          <div aria-hidden className="min-h-12" />
        )}
        {digitButton('0')}
      </div>
    </>
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
  const activeValue = activeTarget ? keypad.getActiveValue() : ''
  const setCount = activeTarget
    ? keypad.getSetCount(activeTarget.exerciseId)
    : 0

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
          activeValue={activeValue}
          setCount={setCount}
          weightUnit={keypad.weightUnit}
          appendDigit={keypad.appendDigit}
          backspace={keypad.backspace}
          adjustWeight={keypad.adjustWeight}
          copyPrevious={keypad.copyPrevious}
          goNext={keypad.goNext}
          goPreviousSet={keypad.goPreviousSet}
          goNextSet={keypad.goNextSet}
          canGoPreviousSet={keypad.canGoPreviousSet}
          canGoNextSet={keypad.canGoNextSet}
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
