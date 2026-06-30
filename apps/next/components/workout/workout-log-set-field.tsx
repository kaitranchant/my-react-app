'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { WorkoutLogKeypadField } from '@/lib/workout-log-keypad'

import { useWorkoutLogKeypad } from './workout-log-keypad-context'

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
      onPointerDown={(event) => {
        event.preventDefault()
        if (disabled) return
        keypad.openField(
          { exerciseId, setNumber, field },
          cellRef.current
        )
      }}
      className={cn(
        'bg-background flex h-9 min-w-0 items-center justify-center rounded-lg border px-1.5 text-center text-base font-medium transition-[color,box-shadow] outline-none sm:h-10 sm:px-2 sm:text-sm',
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
