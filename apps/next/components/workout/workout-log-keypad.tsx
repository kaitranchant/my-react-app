'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  Copy,
  Delete,
  Keyboard,
  Layers,
} from 'lucide-react'

import type { ActiveKeypadTarget } from '@/lib/workout-log-keypad'
import { cn } from '@/lib/utils'

import {
  getWeightStepLabel,
  useWorkoutLogKeypad,
} from './workout-log-keypad-context'

const KEYPAD_EXIT_MS = 260

type ViewportFrame = {
  left: number
  width: number
  bottom: number
}

function getViewportFrame(): ViewportFrame {
  if (typeof window === 'undefined') {
    return { left: 0, width: 0, bottom: 0 }
  }

  const visualViewport = window.visualViewport
  if (!visualViewport) {
    return {
      left: 0,
      width: document.documentElement.clientWidth,
      bottom: 0,
    }
  }

  return {
    left: visualViewport.offsetLeft,
    width: visualViewport.width,
    bottom: Math.max(
      0,
      window.innerHeight - visualViewport.height - visualViewport.offsetTop
    ),
  }
}

function useViewportFrame(active: boolean) {
  const [frame, setFrame] = React.useState<ViewportFrame>(getViewportFrame)

  React.useEffect(() => {
    if (!active) return

    const update = () => setFrame(getViewportFrame())
    update()

    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', update)
    visualViewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      visualViewport?.removeEventListener('resize', update)
      visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [active])

  return frame
}

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
        'flex min-w-0 items-center justify-center rounded-md text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 sm:rounded-lg sm:text-sm',
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
      className="box-border grid w-full max-w-full min-w-0 grid-cols-5 gap-0.5 px-1.5 pt-1.5 sm:gap-1 sm:px-2 sm:pt-2"
      style={{
        gridTemplateRows: 'repeat(4, minmax(2.25rem, auto))',
      }}
    >
      <KeypadButton
        aria-label={`Add ${increment.replace('+', '')} ${weightUnit}`}
        disabled={!isWeightField}
        onClick={() => adjustWeight(getWeightIncrementValue(weightUnit))}
        className="h-full min-h-9 text-[11px] sm:min-h-10 sm:text-xs"
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
        className="h-full min-h-9 sm:min-h-10"
      >
        <Copy className="size-4 sm:size-5" />
      </KeypadButton>

      <KeypadButton
        aria-label={`Subtract ${decrement.replace('-', '')} ${weightUnit}`}
        disabled={!isWeightField}
        onClick={() => adjustWeight(-getWeightIncrementValue(weightUnit))}
        className="h-full min-h-9 text-[11px] sm:min-h-10 sm:text-xs"
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
        className="row-span-2 h-full min-h-[calc(4.75rem+0.125rem)] text-xs font-bold sm:min-h-[calc(5.25rem+0.25rem)] sm:text-sm"
      >
        NEXT
      </KeypadButton>

      <KeypadButton
        aria-label="Plate calculator"
        variant="icon"
        disabled={!isWeightField}
        onClick={openPlateSheet}
        className="h-full min-h-9 sm:min-h-10"
      >
        <Layers className="size-4 sm:size-5" />
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
        <Delete className="size-4 sm:size-5" />
      </KeypadButton>
      <KeypadButton
        aria-label="Hide keyboard"
        variant="icon"
        onClick={closeKeypad}
        className="h-full min-h-9 sm:min-h-10"
      >
        <Keyboard className="size-4 sm:size-5" />
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

  const [renderContent, setRenderContent] = React.useState(isOpen)
  const [motionState, setMotionState] = React.useState<
    'closed' | 'open' | 'closing'
  >('closed')
  const [canPortal, setCanPortal] = React.useState(false)
  const surfaceRef = React.useRef<HTMLDivElement>(null)
  const wasOpenRef = React.useRef(isOpen)
  const viewport = useViewportFrame(Boolean(keypad?.enabled && renderContent))

  React.useEffect(() => {
    setCanPortal(true)
  }, [])

  React.useEffect(() => {
    if (!keypad?.enabled) {
      wasOpenRef.current = false
      setRenderContent(false)
      setMotionState('closed')
      keypad?.setKeypadReserveHeight(0)
      return
    }

    if (isOpen) {
      setRenderContent(true)
      if (!wasOpenRef.current) {
        setMotionState('closed')
        const frame = requestAnimationFrame(() => {
          requestAnimationFrame(() => setMotionState('open'))
        })
        wasOpenRef.current = true
        return () => cancelAnimationFrame(frame)
      }
      setMotionState('open')
      wasOpenRef.current = true
      return
    }

    wasOpenRef.current = false
    if (!renderContent) return

    setMotionState('closing')
    const timer = window.setTimeout(() => {
      setRenderContent(false)
      setMotionState('closed')
      keypad.setKeypadReserveHeight(0)
    }, KEYPAD_EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [isOpen, keypad, renderContent])

  React.useLayoutEffect(() => {
    if (!keypad?.enabled || !renderContent || !surfaceRef.current) return

    const surface = surfaceRef.current
    const updateReserve = () => {
      if (motionState === 'closing') return
      keypad.setKeypadReserveHeight(surface.offsetHeight)
    }

    updateReserve()

    const observer = new ResizeObserver(updateReserve)
    observer.observe(surface)

    return () => observer.disconnect()
  }, [keypad, motionState, renderContent])

  if (!keypad?.enabled || !renderContent || !canPortal) {
    return null
  }

  const activeTarget = keypad.activeTarget ?? activeTargetRef.current
  if (!activeTarget) {
    return null
  }

  const overlay = (
    <div
      ref={surfaceRef}
      role="group"
      aria-label="Workout entry keypad"
      aria-hidden={!isOpen}
      data-state={motionState === 'closing' ? 'closing' : motionState === 'open' ? 'open' : 'closed'}
      className="workout-log-keypad-surface"
      style={{
        left: viewport.left,
        width: viewport.width,
        bottom: viewport.bottom,
      }}
    >
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
    </div>
  )

  return createPortal(overlay, document.body)
}

function WorkoutLogKeypadReserve() {
  const keypad = useWorkoutLogKeypad()

  if (!keypad?.enabled) {
    return null
  }

  return (
    <div
      aria-hidden
      className="shrink-0 transition-[height] duration-300 ease-out"
      style={{ height: keypad.keypadReserveHeight }}
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
