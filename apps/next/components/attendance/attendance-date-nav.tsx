'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { buildAttendanceHref } from '@/lib/attendance-page-data'
import { Button } from '@/components/ui/button'
import { FilterPillLinks } from '@/components/ui/filter-pills'
import { addDaysToDateKey, getWeekStartDateKey, parseDateKey } from '@/lib/calendar'
import type { AttendanceViewMode } from '@/lib/validations/attendance'
import type { WeekStartsOn } from 'app/types/database'

type AttendanceDateNavProps = {
  date: string
  today: string
  view: AttendanceViewMode
  weekStartsOn: WeekStartsOn
}

function formatDateLabel(dateKey: string, today: string) {
  const date = parseDateKey(dateKey)
  const label = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  if (dateKey === today) {
    return `Today — ${label}`
  }

  return label
}

function formatWeekLabel(
  dateKey: string,
  weekStartsOn: WeekStartsOn,
  today: string
) {
  const weekStart = getWeekStartDateKey(dateKey, weekStartsOn)
  const weekEnd = addDaysToDateKey(weekStart, 6)
  const start = parseDateKey(weekStart)
  const end = parseDateKey(weekEnd)
  const sameMonth = start.getMonth() === end.getMonth()
  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const endLabel = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (weekStart <= today && today <= weekEnd) {
    return `This week — ${startLabel}–${endLabel}`
  }

  return `${startLabel}–${endLabel}`
}

export function AttendanceDateNav({
  date,
  today,
  view,
  weekStartsOn,
}: AttendanceDateNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [displayDate, setDisplayDate] = React.useState(date)
  const [isPending, startTransition] = React.useTransition()

  React.useEffect(() => {
    setDisplayDate(date)
  }, [date])

  const stepDays = view === 'weekly' ? 7 : 1

  function dateHref(nextDate: string) {
    return buildAttendanceHref(pathname, searchParams, {
      date: nextDate === today ? null : nextDate,
    })
  }

  function navigateToDate(nextDate: string) {
    setDisplayDate(nextDate)
    startTransition(() => {
      router.replace(dateHref(nextDate), { scroll: false })
    })
  }

  function navigateWeek(direction: -1 | 1) {
    const weekStart = getWeekStartDateKey(displayDate, weekStartsOn)
    navigateToDate(addDaysToDateKey(weekStart, direction * 7))
  }

  React.useEffect(() => {
    const previousDate = addDaysToDateKey(displayDate, -stepDays)
    const nextDate = addDaysToDateKey(displayDate, stepDays)
    router.prefetch(dateHref(previousDate))
    router.prefetch(dateHref(nextDate))
  }, [displayDate, router, searchParams, stepDays, today, pathname])

  const viewOptions = [
    {
      href: buildAttendanceHref(pathname, searchParams, { view: null }),
      label: 'Daily',
      active: view === 'daily',
    },
    {
      href: buildAttendanceHref(pathname, searchParams, { view: 'weekly' }),
      label: 'Weekly',
      active: view === 'weekly',
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterPillLinks size="sm" options={viewOptions} />

      <div
        className={`flex items-center gap-1 transition-opacity ${isPending ? 'opacity-70' : ''}`}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={view === 'weekly' ? 'Previous week' : 'Previous day'}
          onClick={() =>
            view === 'weekly'
              ? navigateWeek(-1)
              : navigateToDate(addDaysToDateKey(displayDate, -stepDays))
          }
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="px-2 text-sm font-medium">
          {view === 'weekly'
            ? formatWeekLabel(displayDate, weekStartsOn, today)
            : formatDateLabel(displayDate, today)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={view === 'weekly' ? 'Next week' : 'Next day'}
          onClick={() =>
            view === 'weekly'
              ? navigateWeek(1)
              : navigateToDate(addDaysToDateKey(displayDate, stepDays))
          }
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
