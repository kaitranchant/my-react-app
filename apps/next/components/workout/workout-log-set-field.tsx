'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { WorkoutLogKeypadField } from '@/lib/workout-log-keypad'

import { useWorkoutLogKeypad } from './workout-log-keypad-context'

const TAP_MOVE_THRESHOLD_PX = 10

function useTapToOpen(onTap: () => void, disabled = false) {
  const startRef = React.useRef<{ x: number; y: number } | null>(null)
  const cancelledRef = React.useRef(false)

  return React.useMemo(
    () => ({
      onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
        if (disabled) return
        startRef.current = { x: event.clientX, y: event.clientY }
        cancelledRef.current = false
      },
      onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => {
        const start = startRef.current
        if (!start || cancelledRef.current) return
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
          cancelledRef.current = true
        }
      },
      onPointerUp: () => {
        if (disabled || cancelledRef.current || !startRef.current) {
          startRef.current = null
          return
        }
        startRef.current = null
        onTap()
      },
      onPointerCancel: () => {
        startRef.current = null
        cancelledRef.current = true
      },
    }),
    [disabled, onTap]
  )
}

type WorkoutLogSetFieldProps = {
  exerciseId: string
  setNumber: number
  field: WorkoutLogKeypadField
  value: string
  disabled?: boolean
  placeholder?: string
  ariaLabel: string
  className?: string
  onChange: (value: string) => void
}

export function WorkoutLogSetField({
  exerciseId,
  setNumber,
  field,
  value,
  disabled = false,
  placeholder = '—',
  ariaLabel,
  className,
  onChange,
}: WorkoutLogSetFieldProps) {
  const keypad = useWorkoutLogKeypad()
  const cellRef = React.useRef<HTMLButtonElement>(null)

  const openKeypad = React.useCallback(() => {
    if (!keypad?.enabled || disabled) return
    keypad.openField({ exerciseId, setNumber, field }, cellRef.current)
  }, [disabled, exerciseId, field, keypad, setNumber])

  const tapHandlers = useTapToOpen(
    openKeypad,
    disabled || !keypad?.enabled
  )

  if (!keypad?.enabled || disabled) {
    const inputMode =
      field === 'reps' || field === 'durationSeconds' ? 'numeric' : 'decimal'

    return (
      <Input
        type="number"
        inputMode={inputMode}
        min={0}
        step={field === 'weight' ? '0.5' : field === 'barSpeed' ? '0.01' : undefined}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={className}
        aria-label={ariaLabel}
      />
    )
  }

  const isActive = keypad.isFieldActive(exerciseId, setNumber, field)
  const displayValue = value || placeholder

  return (
    <button
      ref={cellRef}
      type="button"
      disabled={disabled}
      data-workout-log-field={`${exerciseId}:${setNumber}:${field}`}
      aria-label={ariaLabel}
      aria-selected={isActive}
      {...tapHandlers}
      className={cn(
        'bg-background flex h-9 min-w-0 touch-pan-y items-center justify-center rounded-lg border px-1.5 text-center text-base font-medium transition-[color,box-shadow] outline-none sm:h-10 sm:px-2 sm:text-sm',
        isActive
          ? 'border-brand ring-brand/40 ring-2'
          : 'border-input hover:bg-muted/40',
        !value && 'text-muted-foreground',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <span className="truncate tabular-nums">{displayValue}</span>
    </button>
  )
}
