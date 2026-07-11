'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { addDaysToDateKey, formatDayHeader, toDateKey } from '@/lib/calendar'
import { cn } from '@/lib/utils'

type NutritionLogDateNavProps = {
  value: string
  onChange: (dateKey: string) => void
  disabled?: boolean
  className?: string
}

export function NutritionLogDateNav({
  value,
  onChange,
  disabled = false,
  className,
}: NutritionLogDateNavProps) {
  const todayKey = toDateKey(new Date())
  const dateInputRef = React.useRef<HTMLInputElement>(null)
  const isToday = value === todayKey

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={disabled}
        onClick={() => onChange(addDaysToDateKey(value, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-w-[4.5rem] px-3"
        disabled={disabled}
        onClick={() => dateInputRef.current?.showPicker?.()}
        aria-label={
          isToday
            ? 'Select date, currently Today'
            : `Select date, currently ${formatDayHeader(value)}`
        }
      >
        {isToday ? 'Today' : formatDayHeader(value)}
      </Button>
      <input
        ref={dateInputRef}
        type="date"
        value={value}
        max={todayKey}
        disabled={disabled}
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value > todayKey ? todayKey : event.target.value)
          }
        }}
        className="sr-only"
        tabIndex={-1}
        aria-label="Log date"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={disabled || value >= todayKey}
        onClick={() => onChange(addDaysToDateKey(value, 1))}
        aria-label="Next day"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
