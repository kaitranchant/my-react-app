'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMonthYear, getMonthGrid } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary } from 'app/types/database'

type CalendarMonthGridProps = {
  year: number
  month: number
  selectedDate: string
  scheduledDays: CalendarDaySummary[]
  onMonthChange: (year: number, month: number) => void
  onSelectDate: (dateKey: string) => void
}

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const

export function CalendarMonthGrid({
  year,
  month,
  selectedDate,
  scheduledDays,
  onMonthChange,
  onSelectDate,
}: CalendarMonthGridProps) {
  const cells = getMonthGrid(year, month)
  const scheduledByDate = new Map(
    scheduledDays.map((day) => [day.scheduled_date, day])
  )

  function goToPreviousMonth() {
    const date = new Date(year, month - 1, 1)
    onMonthChange(date.getFullYear(), date.getMonth())
  }

  function goToNextMonth() {
    const date = new Date(year, month + 1, 1)
    onMonthChange(date.getFullYear(), date.getMonth())
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-4 pb-2">
        <CardTitle className="text-sm font-semibold">
          {formatMonthYear(year, month)}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={goToPreviousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEKDAY_HEADERS.map((label, index) => (
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
                onClick={() => onSelectDate(cell.dateKey!)}
                className={cn(
                  'relative flex h-9 flex-col items-center justify-center rounded-sm text-sm transition-colors',
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
                      isSelected ? 'bg-brand-foreground' : 'bg-emerald-500'
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
