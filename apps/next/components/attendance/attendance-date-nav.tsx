'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterPills } from '@/components/ui/filter-pills'
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

  function pushWithParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function navigateToDate(nextDate: string) {
    pushWithParams({
      date: nextDate === today ? null : nextDate,
    })
  }

  function navigateWeek(direction: -1 | 1) {
    const weekStart = getWeekStartDateKey(date, weekStartsOn)
    navigateToDate(addDaysToDateKey(weekStart, direction * 7))
  }

  function handleViewChange(nextView: AttendanceViewMode) {
    pushWithParams({
      view: nextView === 'daily' ? null : nextView,
    })
  }

  const stepDays = view === 'weekly' ? 7 : 1

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={view === 'weekly' ? 'Previous week' : 'Previous day'}
            onClick={() =>
              view === 'weekly'
                ? navigateWeek(-1)
                : navigateToDate(addDaysToDateKey(date, -stepDays))
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={view === 'weekly' ? 'Next week' : 'Next day'}
            onClick={() =>
              view === 'weekly'
                ? navigateWeek(1)
                : navigateToDate(addDaysToDateKey(date, stepDays))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <FilterPills
          value={view}
          onChange={(value) => handleViewChange(value as AttendanceViewMode)}
          size="sm"
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </div>
      <p className="text-sm font-medium">
        {view === 'weekly'
          ? formatWeekLabel(date, weekStartsOn, today)
          : formatDateLabel(date, today)}
      </p>
    </div>
  )
}
