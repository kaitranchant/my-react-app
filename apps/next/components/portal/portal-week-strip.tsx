'use client'

import Link from 'next/link'
import { Minus } from 'lucide-react'

import { getWeekDayLabels } from '@/lib/calendar'
import { getWorkoutToneContainerClass } from '@/lib/status-colors'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary } from 'app/types/database'

type PortalWeekStripProps = {
  weekSessions: CalendarDaySummary[]
  workoutsHref?: string
  weekStartsOn?: import('app/types/database').WeekStartsOn
}

const STATUS_LEGEND = [
  { label: 'Completed', tone: 'success' as const },
  { label: 'In progress', tone: 'active' as const },
  { label: 'Skipped', tone: 'warning' as const },
  { label: 'Scheduled', tone: 'muted' as const },
]

function getSessionBoxClass(
  session: CalendarDaySummary,
  isToday: boolean
): string {
  if (isToday) {
    return 'border-brand bg-brand text-brand-foreground'
  }

  const { tone } = getWorkoutDisplayStatus(
    session.status,
    workoutHasProgress(session, [])
  )

  return cn(
    'text-foreground',
    getWorkoutToneContainerClass(tone, false),
    'hover:opacity-90'
  )
}

export function PortalWeekStrip({
  weekSessions,
  workoutsHref = '/portal/workouts',
  weekStartsOn = 'monday',
}: PortalWeekStripProps) {
  const weekDays = getWeekDayLabels(weekStartsOn)
  const sessionsByDate = new Map(
    weekSessions.map((session) => [session.scheduled_date, session])
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {weekDays.map(({ label, dateKey, isToday }) => {
          const session = sessionsByDate.get(dateKey)
          const boxClassName = cn(
            'flex size-9 flex-col items-center justify-center rounded-lg border transition-colors sm:size-10',
            session
              ? getSessionBoxClass(session, isToday)
              : isToday
                ? 'border-brand bg-brand text-brand-foreground'
                : 'border-border bg-muted/40 text-muted-foreground'
          )
          const boxContent = session ? (
            <span className="max-w-full truncate px-0.5 text-[8px] font-semibold sm:text-[9px]">
              {session.name.length > 6
                ? `${session.name.slice(0, 5)}…`
                : session.name}
            </span>
          ) : (
            <Minus className="size-3.5" strokeWidth={2.5} />
          )

          return (
            <div key={dateKey} className="flex flex-col items-center gap-1.5">
              {session ? (
                <Link
                  href={`${workoutsHref}?date=${dateKey}`}
                  title={`${session.name} — ${getWorkoutDisplayStatus(session.status, workoutHasProgress(session, [])).label}`}
                  aria-label={`Open ${session.name} workout (${getWorkoutDisplayStatus(session.status, workoutHasProgress(session, [])).label})`}
                  className={boxClassName}
                >
                  {boxContent}
                </Link>
              ) : (
                <Link
                  href={`${workoutsHref}?date=${dateKey}`}
                  aria-label={`Open ${label} on calendar`}
                  className={boxClassName}
                >
                  {boxContent}
                </Link>
              )}
              <span
                className={cn(
                  'text-[11px] font-medium sm:text-xs',
                  isToday ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1"
        aria-label="Workout status legend"
      >
        {STATUS_LEGEND.map(({ label, tone }) => (
          <span
            key={label}
            className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]"
          >
            <span
              className={cn(
                'size-2.5 rounded-sm border',
                getWorkoutToneContainerClass(tone, false)
              )}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
