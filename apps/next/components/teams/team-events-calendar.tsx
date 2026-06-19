'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatMonthYear, getMonthGrid } from '@/lib/calendar'
import { teamEventTypeDotClass, teamEventTypeLabels } from '@/lib/team-labels'
import { cn } from '@/lib/utils'
import type { TeamEventWithMemberStatus } from 'app/types/database'

type TeamEventsCalendarProps = {
  events: TeamEventWithMemberStatus[]
  selectedDate: string | null
  onSelectDate: (dateKey: string) => void
}

export function TeamEventsCalendar({
  events,
  selectedDate,
  onSelectDate,
}: TeamEventsCalendarProps) {
  const initial = selectedDate
    ? new Date(`${selectedDate}T12:00:00`)
    : new Date()
  const [year, setYear] = React.useState(initial.getFullYear())
  const [month, setMonth] = React.useState(initial.getMonth())

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, TeamEventWithMemberStatus[]>()
    for (const event of events) {
      const existing = map.get(event.event_date) ?? []
      existing.push(event)
      map.set(event.event_date, existing)
    }
    return map
  }, [events])

  const grid = getMonthGrid(year, month)

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium">{formatMonthYear(year, month)}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, index) => {
          if (!cell.dateKey) {
            return <div key={`empty-${index}`} className="min-h-14" />
          }

          const dayEvents = eventsByDate.get(cell.dateKey) ?? []
          const isSelected = selectedDate === cell.dateKey

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => onSelectDate(cell.dateKey!)}
              className={cn(
                'flex min-h-14 flex-col items-center gap-1 rounded-md border p-1 text-xs transition-colors hover:bg-muted/60',
                isSelected && 'border-brand bg-brand/5'
              )}
            >
              <span>{cell.day}</span>
              <div className="flex flex-wrap justify-center gap-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    className={cn(
                      'size-1.5 rounded-full',
                      teamEventTypeDotClass[event.event_type]
                    )}
                    title={`${teamEventTypeLabels[event.event_type]}: ${event.title}`}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(teamEventTypeLabels) as Array<keyof typeof teamEventTypeLabels>).map(
          (type) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <span
                className={cn('size-2 rounded-full', teamEventTypeDotClass[type])}
              />
              {teamEventTypeLabels[type]}
            </span>
          )
        )}
      </div>
    </div>
  )
}
