'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Dumbbell, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMonthYear, getMonthGrid } from '@/lib/calendar'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary } from 'app/types/database'

type CalendarMonthGridProps = {
  year: number
  month: number
  selectedDate: string
  scheduledDays: CalendarDaySummary[]
  onMonthChange: (year: number, month: number) => void
  onSelectDate: (dateKey: string) => void
  onDayDoubleClick?: (dateKey: string) => void
  variant?: 'compact' | 'full'
  loading?: boolean
}

const DOUBLE_CLICK_DELAY_MS = 200

type CalendarDayCellProps = {
  dateKey: string
  day: number
  isSelected: boolean
  isToday: boolean
  scheduled?: CalendarDaySummary
  onSelectDate: (dateKey: string) => void
  onDayDoubleClick?: (dateKey: string) => void
}

function CalendarDayCell({
  dateKey,
  day,
  isSelected,
  isToday,
  scheduled,
  onSelectDate,
  onDayDoubleClick,
}: CalendarDayCellProps) {
  const clickTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  function handleClick() {
    if (!onDayDoubleClick) {
      onSelectDate(dateKey)
      return
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
      onDayDoubleClick(dateKey)
      return
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null
      onSelectDate(dateKey)
    }, DOUBLE_CLICK_DELAY_MS)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectDate(dateKey)
        }
      }}
      title={
        onDayDoubleClick
          ? scheduled
            ? 'Double-click to edit workout'
            : 'Double-click to schedule workout'
          : undefined
      }
      className={cn(
        'group relative flex min-h-[120px] cursor-pointer flex-col border-r border-b p-2 text-left transition-colors last:border-r-0',
        isSelected
          ? 'bg-brand/5 ring-brand ring-2 ring-inset'
          : 'hover:bg-muted/30',
        isToday && !isSelected && 'bg-muted/20'
      )}
    >
      <span
        className={cn(
          'inline-flex size-7 items-center justify-center rounded-full text-sm font-medium',
          isSelected && 'bg-brand text-brand-foreground font-semibold',
          isToday && !isSelected && 'ring-foreground/30 ring-1'
        )}
      >
        {day}
      </span>

      {scheduled ? (
        <div
          className={cn(
            'mt-2 flex flex-1 flex-col rounded-md border px-2 py-1.5 text-left transition-colors',
            getScheduledDayStyles(scheduled, isSelected)
          )}
        >
          <p className="line-clamp-2 text-xs leading-snug font-semibold">
            {scheduled.name}
          </p>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
            <Dumbbell className="size-2.5 shrink-0" />
            {getWorkoutDisplayStatus(
              scheduled.status,
              workoutHasProgress(scheduled, [])
            ).label}
          </p>
        </div>
      ) : (
        <div className="mt-auto flex justify-center pb-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
            <Plus className="size-3" />
            Schedule
          </span>
        </div>
      )}
    </div>
  )
}

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAY_HEADERS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

function getScheduledDayStyles(
  scheduled: CalendarDaySummary,
  isSelected: boolean
) {
  const { tone } = getWorkoutDisplayStatus(
    scheduled.status,
    workoutHasProgress(scheduled, [])
  )

  if (tone === 'success') {
    return isSelected
      ? 'border-emerald-500/40 bg-emerald-500/15'
      : 'border-emerald-500/30 bg-emerald-500/10'
  }

  if (tone === 'active') {
    return isSelected
      ? 'border-brand/40 bg-brand/15'
      : 'border-brand/30 bg-brand/10'
  }

  if (tone === 'warning') {
    return isSelected
      ? 'border-amber-500/40 bg-amber-500/15'
      : 'border-amber-500/30 bg-amber-500/10'
  }

  return isSelected
    ? 'border-brand/30 bg-brand/10'
    : 'border-border bg-background group-hover:border-brand/20 group-hover:bg-muted/40'
}

function getScheduledDotClass(
  scheduled: CalendarDaySummary,
  isSelected: boolean
) {
  const { tone } = getWorkoutDisplayStatus(
    scheduled.status,
    workoutHasProgress(scheduled, [])
  )

  if (tone === 'success') {
    return isSelected ? 'bg-emerald-700' : 'bg-emerald-500'
  }
  if (tone === 'active') {
    return isSelected ? 'bg-brand-foreground' : 'bg-brand'
  }
  if (tone === 'warning') {
    return isSelected ? 'bg-amber-700' : 'bg-amber-500'
  }
  return isSelected ? 'bg-brand-foreground' : 'bg-emerald-500'
}

export function CalendarMonthGrid({
  year,
  month,
  selectedDate,
  scheduledDays,
  onMonthChange,
  onSelectDate,
  onDayDoubleClick,
  variant = 'compact',
  loading = false,
}: CalendarMonthGridProps) {
  const cells = getMonthGrid(year, month)
  const scheduledByDate = new Map(
    scheduledDays.map((day) => [day.scheduled_date, day])
  )
  const isFull = variant === 'full'
  const headers = isFull ? WEEKDAY_HEADERS : WEEKDAY_HEADERS_SHORT

  function goToPreviousMonth() {
    const date = new Date(year, month - 1, 1)
    onMonthChange(date.getFullYear(), date.getMonth())
  }

  function goToNextMonth() {
    const date = new Date(year, month + 1, 1)
    onMonthChange(date.getFullYear(), date.getMonth())
  }

  const header = (
    <div className="flex flex-row items-center justify-between">
      <CardTitle className={cn('font-semibold', isFull ? 'text-lg' : 'text-sm')}>
        {formatMonthYear(year, month)}
      </CardTitle>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size={isFull ? 'sm' : 'icon'}
          className={isFull ? 'h-8' : 'size-8'}
          onClick={goToPreviousMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size={isFull ? 'sm' : 'icon'}
          className={isFull ? 'h-8' : 'size-8'}
          onClick={goToNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )

  if (isFull) {
    return (
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-6 py-4">{header}</CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {headers.map((label) => (
              <div
                key={label}
                className="text-muted-foreground border-r px-2 py-2.5 text-center text-xs font-medium last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>

          <div className={cn('grid grid-cols-7', loading && 'opacity-60')}>
            {cells.map((cell, index) => {
              if (!cell.dateKey || cell.day === null) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="bg-muted/20 min-h-[120px] border-r border-b last:border-r-0"
                  />
                )
              }

              const scheduled = scheduledByDate.get(cell.dateKey)
              const isSelected = cell.dateKey === selectedDate

              return (
                <CalendarDayCell
                  key={cell.dateKey}
                  dateKey={cell.dateKey}
                  day={cell.day}
                  isSelected={isSelected}
                  isToday={cell.isToday}
                  scheduled={scheduled}
                  onSelectDate={onSelectDate}
                  onDayDoubleClick={onDayDoubleClick}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-2">
        {header}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {headers.map((label, index) => (
            <div
              key={`${label}-${index}`}
              className="text-muted-foreground text-center text-[11px] font-medium"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (!cell.dateKey || cell.day === null) {
              return <div key={`empty-${index}`} className="h-9" />
            }

            const scheduled = scheduledByDate.get(cell.dateKey)
            const isSelected = cell.dateKey === selectedDate

            return (
              <button
                key={cell.dateKey}
                type="button"
                title={
                  scheduled
                    ? `${cell.day} — ${scheduled.name}`
                    : String(cell.day)
                }
                onClick={() => onSelectDate(cell.dateKey!)}
                className={cn(
                  'relative flex h-9 flex-col items-center justify-center rounded-md text-sm transition-colors',
                  isSelected
                    ? 'bg-brand text-brand-foreground font-semibold'
                    : cell.isToday
                      ? 'ring-foreground/30 bg-muted/60 ring-1'
                      : 'hover:bg-muted/60'
                )}
              >
                <span>{cell.day}</span>
                {scheduled && (
                  <span
                    className={cn(
                      'absolute bottom-1 size-1 rounded-full',
                      getScheduledDotClass(scheduled, isSelected)
                    )}
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
