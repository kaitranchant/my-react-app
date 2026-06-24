'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getWeekDayLabels, parseDateKey } from '@/lib/calendar'
import { resolveCoachTimezone, type CoachPreferences } from '@/lib/coach-preferences'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { getDateKeyFromInstant } from '@/lib/session-booking-slots'
import {
  appointmentStatusLabels,
  type CoachingAppointment,
} from '@/lib/session-booking-types'
import { cn } from '@/lib/utils'

const GRID_START_HOUR = 7
const GRID_END_HOUR = 21
const HOUR_HEIGHT = 48
const MOBILE_DAYS_VISIBLE = 3

const statusColors: Record<CoachingAppointment['status'], string> = {
  scheduled: 'bg-primary/15 border-primary/40 text-primary',
  completed: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
  cancelled: 'bg-destructive/10 border-destructive/30 text-destructive',
  no_show: 'bg-amber-500/15 border-amber-600/40 text-amber-800 dark:text-amber-200',
  rescheduled: 'bg-muted border-border text-muted-foreground',
}

type WeekDay = {
  label: string
  dateKey: string
  isToday: boolean
}

type SchedulingWeekCalendarProps = {
  appointments: CoachingAppointment[]
  coachPreferences: CoachPreferences
  weekKeys: string[]
  onSelectAppointment?: (appointment: CoachingAppointment) => void
}

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12} ${period}`
}

function getMinutesInTimezone(
  instant: string,
  timezone: CoachPreferences['timezone']
) {
  const iana = resolveCoachTimezone(timezone)
  const date = new Date(instant)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: iana ?? undefined,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

function CalendarGrid({
  visibleDays,
  appointmentsByDay,
  coachPreferences,
  onSelectAppointment,
  columnMinWidth,
}: {
  visibleDays: WeekDay[]
  appointmentsByDay: Map<string, CoachingAppointment[]>
  coachPreferences: CoachPreferences
  onSelectAppointment?: (appointment: CoachingAppointment) => void
  columnMinWidth?: string
}) {
  const hours = Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, index) => GRID_START_HOUR + index
  )
  const dayCount = visibleDays.length

  return (
    <div
      className="w-full"
      style={
        columnMinWidth
          ? { minWidth: `calc(56px + ${dayCount} * ${columnMinWidth})` }
          : undefined
      }
    >
      <div
        className="grid border-b"
        style={{ gridTemplateColumns: `56px repeat(${dayCount}, minmax(0, 1fr))` }}
      >
        <div />
        {visibleDays.map((day) => (
          <div
            key={day.dateKey}
            className={cn(
              'border-l px-2 py-2 text-center',
              day.isToday && 'bg-primary/5'
            )}
          >
            <p className="text-muted-foreground text-xs font-medium">{day.label}</p>
            <p
              className={cn('text-sm font-semibold', day.isToday && 'text-primary')}
            >
              {day.dateKey.slice(8)}
            </p>
          </div>
        ))}
      </div>

      <div
        className="relative grid"
        style={{ gridTemplateColumns: `56px repeat(${dayCount}, minmax(0, 1fr))` }}
      >
        <div>
          {hours.map((hour) => (
            <div
              key={hour}
              className="text-muted-foreground border-b pr-2 text-right text-[11px] leading-none"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="relative -top-2 inline-block">
                {formatHourLabel(hour)}
              </span>
            </div>
          ))}
        </div>

        {visibleDays.map((day) => (
          <div
            key={day.dateKey}
            className={cn('relative border-l', day.isToday && 'bg-primary/[0.03]')}
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-b border-dashed border-border/60"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}

            {(appointmentsByDay.get(day.dateKey) ?? []).map((appointment) => {
              const startMinutes = getMinutesInTimezone(
                appointment.starts_at,
                coachPreferences.timezone
              )
              const endMinutes = getMinutesInTimezone(
                appointment.ends_at,
                coachPreferences.timezone
              )
              const gridStart = GRID_START_HOUR * 60
              const top = ((startMinutes - gridStart) / 60) * HOUR_HEIGHT
              const height = Math.max(
                28,
                ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT
              )

              if (startMinutes < gridStart || startMinutes >= GRID_END_HOUR * 60) {
                return null
              }

              return (
                <button
                  key={appointment.id}
                  type="button"
                  onClick={() => onSelectAppointment?.(appointment)}
                  className={cn(
                    'absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-left text-xs shadow-sm transition hover:brightness-95',
                    statusColors[appointment.status]
                  )}
                  style={{ top, height }}
                >
                  <p className="truncate font-medium">
                    {appointment.client?.full_name ?? 'Client'}
                  </p>
                  <p className="truncate opacity-80">
                    {new Intl.DateTimeFormat('en-US', {
                      timeZone:
                        resolveCoachTimezone(coachPreferences.timezone) ?? undefined,
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(appointment.starts_at))}
                  </p>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SchedulingWeekCalendar({
  appointments,
  coachPreferences,
  weekKeys,
  onSelectAppointment,
}: SchedulingWeekCalendarProps) {
  const isMobile = useIsMobile()
  const [dayWindowStart, setDayWindowStart] = React.useState(0)

  const referenceDate = React.useMemo(
    () => parseDateKey(weekKeys[0] ?? new Date().toISOString().slice(0, 10)),
    [weekKeys]
  )

  const weekDays = React.useMemo(
    () => getWeekDayLabels(coachPreferences.weekStartsOn, referenceDate),
    [coachPreferences.weekStartsOn, referenceDate]
  )

  React.useEffect(() => {
    const todayIndex = weekDays.findIndex((day) => day.isToday)
    if (todayIndex >= 0 && isMobile) {
      const centered = Math.min(
        Math.max(todayIndex - 1, 0),
        weekDays.length - MOBILE_DAYS_VISIBLE
      )
      setDayWindowStart(centered)
    }
  }, [isMobile, weekDays])

  const appointmentsByDay = React.useMemo(() => {
    const map = new Map<string, CoachingAppointment[]>()
    for (const day of weekDays) {
      map.set(day.dateKey, [])
    }

    for (const appointment of appointments) {
      const dateKey = getDateKeyFromInstant(
        appointment.starts_at,
        coachPreferences.timezone
      )
      if (map.has(dateKey)) {
        map.get(dateKey)!.push(appointment)
      }
    }

    for (const list of Array.from(map.values())) {
      list.sort(
        (left, right) =>
          new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime()
      )
    }

    return map
  }, [appointments, coachPreferences.timezone, weekDays])

  const visibleDays = isMobile
    ? weekDays.slice(dayWindowStart, dayWindowStart + MOBILE_DAYS_VISIBLE)
    : weekDays

  const canSlideBack = isMobile && dayWindowStart > 0
  const canSlideForward =
    isMobile && dayWindowStart + MOBILE_DAYS_VISIBLE < weekDays.length

  return (
    <div className="space-y-3">
      {isMobile ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={!canSlideBack}
            onClick={() => setDayWindowStart((start) => Math.max(0, start - 1))}
            aria-label="Show earlier days"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            {visibleDays[0]?.label} – {visibleDays[visibleDays.length - 1]?.label}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            disabled={!canSlideForward}
            onClick={() =>
              setDayWindowStart((start) =>
                Math.min(weekDays.length - MOBILE_DAYS_VISIBLE, start + 1)
              )
            }
            aria-label="Show later days"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}

      <div className={cn(!isMobile && 'overflow-x-auto')}>
        <CalendarGrid
          visibleDays={visibleDays}
          appointmentsByDay={appointmentsByDay}
          coachPreferences={coachPreferences}
          onSelectAppointment={onSelectAppointment}
          columnMinWidth={isMobile ? undefined : '96px'}
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {(
          Object.keys(appointmentStatusLabels) as CoachingAppointment['status'][]
        ).map((status) => (
          <Badge
            key={status}
            variant="outline"
            className={cn('font-normal', statusColors[status])}
          >
            {appointmentStatusLabels[status]}
          </Badge>
        ))}
      </div>
    </div>
  )
}
