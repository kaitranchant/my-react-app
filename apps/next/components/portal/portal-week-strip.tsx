'use client'

import Link from 'next/link'
import { Minus } from 'lucide-react'

import { getWeekDayLabels } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary } from 'app/types/database'

type PortalWeekStripProps = {
  weekSessions: CalendarDaySummary[]
  workoutsHref?: string
}

export function PortalWeekStrip({
  weekSessions,
  workoutsHref = '/portal/workouts',
}: PortalWeekStripProps) {
  const weekDays = getWeekDayLabels()
  const sessionsByDate = new Map(
    weekSessions.map((session) => [session.scheduled_date, session])
  )

  return (
    <div className="grid grid-cols-7 gap-2 sm:gap-3">
      {weekDays.map(({ label, dateKey, isToday }) => {
        const session = sessionsByDate.get(dateKey)
        const boxClassName = cn(
          'flex size-9 flex-col items-center justify-center rounded-lg border transition-colors sm:size-10',
          isToday
            ? 'border-brand bg-brand text-brand-foreground'
            : session
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/60'
              : 'border-border bg-muted/40 text-muted-foreground',
          session && 'hover:opacity-90'
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
                title={session.name}
                aria-label={`Open ${session.name} workout`}
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
  )
}
