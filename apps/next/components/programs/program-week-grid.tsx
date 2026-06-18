'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Dumbbell, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatProgramDayLabel,
  formatProgramWeekLabel,
  PROGRAM_WEEKDAY_HEADERS,
} from '@/lib/program-calendar'
import { cn } from '@/lib/utils'
import type { ProgramDaySummary } from 'app/types/database'

type ProgramWeekGridProps = {
  weekIndex: number
  dayOffsets: number[]
  selectedDayOffset: number
  scheduledWorkouts: ProgramDaySummary[]
  onWeekChange: (weekIndex: number) => void
  onSelectDay: (dayOffset: number) => void
  onDayDoubleClick?: (dayOffset: number) => void
  loading?: boolean
}

const DOUBLE_CLICK_DELAY_MS = 200

type ProgramDayCellProps = {
  dayOffset: number
  isSelected: boolean
  scheduled?: ProgramDaySummary
  onSelectDay: (dayOffset: number) => void
  onDayDoubleClick?: (dayOffset: number) => void
}

function ProgramDayCell({
  dayOffset,
  isSelected,
  scheduled,
  onSelectDay,
  onDayDoubleClick,
}: ProgramDayCellProps) {
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
      onSelectDay(dayOffset)
      return
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
      clickTimeoutRef.current = null
      onDayDoubleClick(dayOffset)
      return
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null
      onSelectDay(dayOffset)
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
          onSelectDay(dayOffset)
        }
      }}
      title={
        onDayDoubleClick
          ? scheduled
            ? 'Double-click to edit workout'
            : 'Double-click to add workout'
          : undefined
      }
      className={cn(
        'group relative flex min-h-[120px] cursor-pointer flex-col border-r border-b p-2 text-left transition-colors last:border-r-0',
        isSelected
          ? 'bg-brand/5 ring-brand ring-2 ring-inset'
          : 'hover:bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            'text-muted-foreground text-[10px] font-medium tracking-wide uppercase',
            isSelected && 'text-brand'
          )}
        >
          {formatProgramDayLabel(dayOffset)}
        </span>
      </div>

      {scheduled ? (
        <div
          className={cn(
            'mt-2 flex flex-1 flex-col rounded-md border px-2 py-1.5 text-left transition-colors',
            isSelected
              ? 'border-brand/30 bg-brand/10'
              : 'border-border bg-background group-hover:border-brand/20 group-hover:bg-muted/40'
          )}
        >
          <p className="line-clamp-2 text-xs leading-snug font-semibold">
            {scheduled.name}
          </p>
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
            <Dumbbell className="size-2.5 shrink-0" />
            Scheduled
          </p>
        </div>
      ) : (
        <div className="mt-auto flex justify-center pb-1 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
            <Plus className="size-3" />
            Add workout
          </span>
        </div>
      )}
    </div>
  )
}

export function ProgramWeekGrid({
  weekIndex,
  dayOffsets,
  selectedDayOffset,
  scheduledWorkouts,
  onWeekChange,
  onSelectDay,
  onDayDoubleClick,
  loading = false,
}: ProgramWeekGridProps) {
  const scheduledByOffset = new Map(
    scheduledWorkouts.map((workout) => [workout.day_offset, workout])
  )

  function goToPreviousWeek() {
    if (weekIndex > 0) {
      onWeekChange(weekIndex - 1)
    }
  }

  function goToNextWeek() {
    onWeekChange(weekIndex + 1)
  }

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b px-6 py-4">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {formatProgramWeekLabel(weekIndex)}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={goToPreviousWeek}
              disabled={weekIndex === 0}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={goToNextWeek}
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b">
          {PROGRAM_WEEKDAY_HEADERS.map((label) => (
            <div
              key={label}
              className="text-muted-foreground border-r px-2 py-2.5 text-center text-xs font-medium last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        <div className={cn('grid grid-cols-7', loading && 'opacity-60')}>
          {dayOffsets.map((dayOffset) => {
            const scheduled = scheduledByOffset.get(dayOffset)
            const isSelected = dayOffset === selectedDayOffset

            return (
              <ProgramDayCell
                key={dayOffset}
                dayOffset={dayOffset}
                isSelected={isSelected}
                scheduled={scheduled}
                onSelectDay={onSelectDay}
                onDayDoubleClick={onDayDoubleClick}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
