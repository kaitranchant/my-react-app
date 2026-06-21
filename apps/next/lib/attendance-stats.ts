import { addDaysToDateKey, parseDateKey, toDateKey } from '@/lib/calendar'
import type { TeamEventAttendanceStatus } from 'app/types/database'

export type ClientAttendanceStats = {
  monthAttended: number
  monthTotal: number
  consecutiveAbsences: number
  alertKind: 'consecutive_absences' | 'low_rate' | null
}

const LOW_RATE_THRESHOLD = 0.7
const MIN_SESSIONS_FOR_RATE_ALERT = 4
const CONSECUTIVE_ABSENCE_ALERT = 2

function isAttended(status: TeamEventAttendanceStatus): boolean {
  return status === 'present' || status === 'late'
}

function monthRangeForDate(dateKey: string): { start: string; end: string } {
  const date = parseDateKey(dateKey)
  const start = toDateKey(new Date(date.getFullYear(), date.getMonth(), 1))
  const end = toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))
  return { start, end }
}

export function countConsecutiveAbsences(
  recordsByDate: Map<string, TeamEventAttendanceStatus>,
  referenceDate: string,
  lookbackDays = 14
): number {
  let count = 0

  for (let offset = 0; offset < lookbackDays; offset += 1) {
    const date = addDaysToDateKey(referenceDate, -offset)
    const status = recordsByDate.get(date)
    if (status === undefined) {
      continue
    }
    if (status === 'absent') {
      count += 1
    } else {
      break
    }
  }

  return count
}

export function computeClientAttendanceStats(
  recordsByDate: Map<string, TeamEventAttendanceStatus>,
  referenceDate: string
): ClientAttendanceStats {
  const { start, end } = monthRangeForDate(referenceDate)
  let monthAttended = 0
  let monthTotal = 0

  for (const [date, status] of Array.from(recordsByDate.entries())) {
    if (date < start || date > end || date > referenceDate) {
      continue
    }
    monthTotal += 1
    if (isAttended(status)) {
      monthAttended += 1
    }
  }

  const consecutiveAbsences = countConsecutiveAbsences(
    recordsByDate,
    referenceDate
  )

  let alertKind: ClientAttendanceStats['alertKind'] = null
  if (consecutiveAbsences >= CONSECUTIVE_ABSENCE_ALERT) {
    alertKind = 'consecutive_absences'
  } else if (
    monthTotal >= MIN_SESSIONS_FOR_RATE_ALERT &&
    monthAttended / monthTotal < LOW_RATE_THRESHOLD
  ) {
    alertKind = 'low_rate'
  }

  return {
    monthAttended,
    monthTotal,
    consecutiveAbsences,
    alertKind,
  }
}

export function formatMonthAttendanceSummary(stats: ClientAttendanceStats): string {
  if (stats.monthTotal === 0) {
    return 'No sessions logged this month'
  }
  return `${stats.monthAttended}/${stats.monthTotal} sessions this month`
}
