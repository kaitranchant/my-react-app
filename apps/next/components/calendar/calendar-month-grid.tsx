'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Dumbbell, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMonthYear, getMonthGrid } from '@/lib/calendar'
import { groupSummariesByDate } from '@/lib/calendar-workouts'
import {
  getWorkoutToneContainerClass,
  getWorkoutToneDotClass,
} from '@/lib/status-colors'
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

const WEEKDAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const WEEKDAY_HEADERS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
const MAX_VISIBLE_WORKOUTS = 2

function getScheduledDayStyles(
  scheduled: CalendarDaySummary,
  isSelected: boolean
) {
  const { tone } = getWorkoutDisplayStatus(
    scheduled.status,
    workoutHasProgress(scheduled, [])
  )

  return getWorkoutToneContainerClass(tone, isSelected)
}

function getScheduledDotClass(
  scheduled: CalendarDaySummary,
  isSelected: boolean
) {
  const { tone } = getWorkoutDisplayStatus(
    scheduled.status,
    workoutHasProgress(scheduled, [])
  )

  return getWorkoutToneDotClass(tone, isSelected)
}

type CalendarDayCellProps = {
  dateKey: string
  day: number
  isSelected: boolean
  isToday: boolean
  scheduledWorkouts: CalendarDaySummary[]
  onSelectDate: (dateKey: string) => void
  onDayDoubleClick?: (dateKey: string) => void
}

function ScheduledWorkoutBadge({
  scheduled,
  isSelected,
}: {
  scheduled: CalendarDaySummary
  isSelected: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-md border px-2 py-1.5 text-left transition-colors',
        getScheduledDayStyles(scheduled, isSelected)
      )}
    >
      <p className="line-clamp-1 text-xs leading-snug font-semibold">
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
  )
}

function CalendarDayCell({
  dateKey,
  day,
  isSelected,
  isToday,
  scheduledWorkouts,
  onSelectDate,
  onDayDoubleClick,
}: CalendarDayCellProps) {
  const hasWorkouts = scheduledWorkouts.length > 0
  const visibleWorkouts = scheduledWorkouts.slice(0, MAX_VISIBLE_WORKOUTS)
  const hiddenCount = scheduledWorkouts.length - visibleWorkouts.length

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectDate(dateKey)}
      onDoubleClick={
        onDayDoubleClick
          ? (event) => {
              event.preventDefault()
              onDayDoubleClick(dateKey)
            }
          : undefined
      }
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectDate(dateKey)
        }
      }}
      title={
        onDayDoubleClick
          ? hasWorkouts
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

      {hasWorkouts ? (
        <div className="mt-2 flex flex-1 flex-col gap-1">
          {visibleWorkouts.map((scheduled) => (
            <ScheduledWorkoutBadge
              key={scheduled.id}
              scheduled={scheduled}
              isSelected={isSelected}
            />
          ))}
          {hiddenCount > 0 && (
            <p className="text-muted-foreground px-1 text-[10px] font-medium">
              +{hiddenCount} more
            </p>
          )}
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

type CompactMonthPickerProps = {
  year: number
  month: number
  selectedDate: string
  scheduledByDate: Map<string, CalendarDaySummary[]>
  onSelectDate: (dateKey: string) => void
  loading?: boolean
  weekdayHeaders?: readonly string[]
  className?: string
}

function CompactMonthPicker({
  year,
  month,
  selectedDate,
  scheduledByDate,
  onSelectDate,
  loading = false,
  weekdayHeaders = WEEKDAY_HEADERS_SHORT,
  className,
}: CompactMonthPickerProps) {
  const cells = getMonthGrid(year, month)

  return (
    <div className={className}>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {weekdayHeaders.map((label, index) => (
          <div
            key={`${label}-${index}`}
            className="text-muted-foreground text-center text-[11px] font-medium"
          >
            {label}
          </div>
        ))}
      </div>
      <div className={cn('grid grid-cols-7 gap-1', loading && 'opacity-60')}>
        {cells.map((cell, index) => {
          if (!cell.dateKey || cell.day === null) {
            return <div key={`empty-${index}`} className="min-h-11" />
          }

          const scheduledWorkouts = scheduledByDate.get(cell.dateKey) ?? []
          const isSelected = cell.dateKey === selectedDate

          return (
            <button
              key={cell.dateKey}
              type="button"
              title={
                scheduledWorkouts.length > 0
                  ? `${cell.day} — ${scheduledWorkouts.map((workout) => workout.name).join(', ')}`
                  : String(cell.day)
              }
              onClick={() => onSelectDate(cell.dateKey!)}
              className={cn(
                'relative flex min-h-11 flex-col items-center justify-center rounded-md text-sm transition-colors',
                isSelected
                  ? 'bg-brand text-brand-foreground font-semibold'
                  : cell.isToday
                    ? 'ring-foreground/30 bg-muted/60 ring-1'
                    : 'hover:bg-muted/60'
              )}
            >
              <span>{cell.day}</span>
              {scheduledWorkouts.length > 0 && (
                <span className="absolute bottom-1 flex items-center gap-0.5">
                  {scheduledWorkouts.slice(0, 3).map((scheduled) => (
                    <span
                      key={scheduled.id}
                      className={cn(
                        'size-1.5 rounded-full',
                        getScheduledDotClass(scheduled, isSelected)
                      )}
                      aria-hidden
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type MonthNavHeaderProps = {
  year: number
  month: number
  isFull: boolean
  onPreviousMonth: () => void
  onNextMonth: () => void
}

function MonthNavHeader({
  year,
  month,
  isFull,
  onPreviousMonth,
  onNextMonth,
}: MonthNavHeaderProps) {
  return (
    <div className="flex flex-row items-center justify-between gap-2">
      <CardTitle className={cn('font-semibold', isFull ? 'text-base md:text-lg' : 'text-sm')}>
        {formatMonthYear(year, month)}
      </CardTitle>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size={isFull ? 'sm' : 'icon'}
          className={isFull ? 'h-8' : 'size-8'}
          data-swipe-ignore=""
          onClick={onPreviousMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size={isFull ? 'sm' : 'icon'}
          className={isFull ? 'h-8' : 'size-8'}
          data-swipe-ignore=""
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
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
  const scheduledByDate = groupSummariesByDate(scheduledDays)
  const isFull = variant === 'full'

  function goToPreviousMonth() {
    const date = new Date(year, month - 1, 1)
    onMonthChange(date.getFullYear(), date.getMonth())
  }

  function goToNextMonth() {
    const date = new Date(year, month + 1, 1)
    onMonthChange(date.getFullYear(), date.getMonth())
  }

  const header = (
    <MonthNavHeader
      year={year}
      month={month}
      isFull={isFull}
      onPreviousMonth={goToPreviousMonth}
      onNextMonth={goToNextMonth}
    />
  )

  if (isFull) {
    return (
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b px-4 py-3 md:px-6 md:py-4">
          {header}
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 py-3 md:hidden">
            <CompactMonthPicker
              year={year}
              month={month}
              selectedDate={selectedDate}
              scheduledByDate={scheduledByDate}
              onSelectDate={onSelectDate}
              loading={loading}
            />
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-7 border-b">
              {WEEKDAY_HEADERS.map((label) => (
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

                const scheduledWorkouts = scheduledByDate.get(cell.dateKey) ?? []
                const isSelected = cell.dateKey === selectedDate

                return (
                  <CalendarDayCell
                    key={cell.dateKey}
                    dateKey={cell.dateKey}
                    day={cell.day}
                    isSelected={isSelected}
                    isToday={cell.isToday}
                    scheduledWorkouts={scheduledWorkouts}
                    onSelectDate={onSelectDate}
                    onDayDoubleClick={onDayDoubleClick}
                  />
                )
              })}
            </div>
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
        <CompactMonthPicker
          year={year}
          month={month}
          selectedDate={selectedDate}
          scheduledByDate={scheduledByDate}
          onSelectDate={onSelectDate}
          loading={loading}
        />
      </CardContent>
    </Card>
  )
}
