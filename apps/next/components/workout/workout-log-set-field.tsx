'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { useTapToOpen } from '@/components/mobile-keyboard/use-tap-to-open'
import { cn } from '@/lib/utils'
import type { WorkoutLogKeypadField } from '@/lib/workout-log-keypad'

import { useWorkoutLogKeypad } from './workout-log-keypad-context'

type WorkoutLogSetFieldProps = {
  exerciseId: string
  setNumber: number
  field: WorkoutLogKeypadField
  value: string
  disabled?: boolean
  predicted?: boolean
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
  predicted = false,
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

  const handleNativeEnter = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      if (!keypad || disabled) return

      const next = keypad.advanceFromField(
        { exerciseId, setNumber, field },
        value
      )
      if (next) {
        keypad.focusField(next)
        return
      }

      event.currentTarget.blur()
    },
    [disabled, exerciseId, field, keypad, setNumber, value]
  )

  if (!keypad?.enabled || disabled) {
    const inputMode =
      field === 'reps' ||
      field === 'durationSeconds' ||
      field === 'distanceMeters'
        ? 'numeric'
        : 'decimal'

    return (
      <Input
        type="text"
        inputMode={inputMode}
        enterKeyHint="next"
        value={value}
        disabled={disabled}
        data-workout-log-field={`${exerciseId}:${setNumber}:${field}`}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleNativeEnter}
        onFocus={(event) => {
          if (predicted && value) {
            event.target.select()
          }
        }}
        placeholder={placeholder}
        className={cn(
          className,
          predicted && value && 'text-muted-foreground/50 placeholder:text-muted-foreground/50'
        )}
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
        'bg-background flex h-11 min-w-0 touch-pan-y items-center justify-center rounded-lg border px-2 text-center text-base font-medium transition-[color,box-shadow,transform] duration-75 outline-none active:scale-[0.98] sm:h-10 sm:px-2 sm:text-sm',
        isActive
          ? 'border-brand ring-brand/40 ring-2'
          : 'border-input hover:bg-muted/40',
        !value && 'text-muted-foreground',
        predicted && value && 'text-muted-foreground/50',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <span className="truncate tabular-nums">{displayValue}</span>
    </button>
  )
}
