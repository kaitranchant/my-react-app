import { parseDateKey } from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { getDateKeyFromInstant } from '@/lib/session-booking-slots'

export type SeriesScheduleContext = {
  timezone: CoachPreferences['timezone']
  clientTimeZone?: string | null
}

export const ONGOING_SERIES_MIN_HORIZON_DAYS = 84
const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY

export function computeSeriesHorizonDays(bookingMaxDaysAhead: number) {
  return Math.max(bookingMaxDaysAhead, ONGOING_SERIES_MIN_HORIZON_DAYS)
}

export function getSeriesHorizonEnd(from: Date, horizonDays: number) {
  const end = new Date(from)
  end.setUTCDate(end.getUTCDate() + horizonDays)
  return end
}

export function offsetStartsAtByWeeks(anchorStartsAtIso: string, weekIndex: number) {
  if (weekIndex === 0) return anchorStartsAtIso

  const startsAt = new Date(anchorStartsAtIso)
  startsAt.setUTCDate(startsAt.getUTCDate() + weekIndex * 7)
  return startsAt.toISOString()
}

export function getWeekIndexFromAnchor(
  anchorStartsAtIso: string,
  startsAtIso: string,
  schedule?: SeriesScheduleContext
) {
  if (schedule) {
    const anchorDateKey = getDateKeyFromInstant(
      anchorStartsAtIso,
      schedule.timezone,
      schedule.clientTimeZone
    )
    const startsDateKey = getDateKeyFromInstant(
      startsAtIso,
      schedule.timezone,
      schedule.clientTimeZone
    )
    const anchorDate = parseDateKey(anchorDateKey)
    const startsDate = parseDateKey(startsDateKey)
    const dayDiff = Math.round(
      (startsDate.getTime() - anchorDate.getTime()) / MS_PER_DAY
    )

    return Math.floor(dayDiff / 7)
  }

  const anchor = new Date(anchorStartsAtIso).getTime()
  const startsAt = new Date(startsAtIso).getTime()
  return Math.floor((startsAt - anchor) / MS_PER_WEEK)
}

export function getLatestSeriesWeekIndex(
  anchorStartsAtIso: string,
  startsAtValues: string[],
  schedule?: SeriesScheduleContext
) {
  let latest = -1

  for (const startsAtIso of startsAtValues) {
    const weekIndex = getWeekIndexFromAnchor(
      anchorStartsAtIso,
      startsAtIso,
      schedule
    )
    if (weekIndex > latest) {
      latest = weekIndex
    }
  }

  return latest
}

export function isSeriesOccurrenceAtOrAfterWeek(
  anchorStartsAtIso: string,
  startsAtIso: string,
  fromWeekIndex: number,
  maxWeekIndex: number | null = null,
  schedule?: SeriesScheduleContext
) {
  const weekIndex = getWeekIndexFromAnchor(
    anchorStartsAtIso,
    startsAtIso,
    schedule
  )
  if (weekIndex < fromWeekIndex) return false
  if (maxWeekIndex != null && weekIndex > maxWeekIndex) return false
  return true
}

export function isOrphanSeriesOccurrenceAtOrAfterWeek(
  anchorStartsAtIso: string,
  startsAtIso: string,
  fromWeekIndex: number,
  maxWeekIndex: number | null = null,
  schedule?: SeriesScheduleContext
) {
  const weekIndex = getWeekIndexFromAnchor(
    anchorStartsAtIso,
    startsAtIso,
    schedule
  )
  if (weekIndex < fromWeekIndex) return false
  if (maxWeekIndex != null && weekIndex > maxWeekIndex) return false
  return startsAtIso === offsetStartsAtByWeeks(anchorStartsAtIso, weekIndex)
}

export function countWeekIndexesThroughHorizon(
  anchorStartsAtIso: string,
  horizonEnd: Date
) {
  const indexes: number[] = []
  let weekIndex = 0

  while (true) {
    const startsAt = new Date(offsetStartsAtByWeeks(anchorStartsAtIso, weekIndex))
    if (startsAt > horizonEnd) break
    indexes.push(weekIndex)
    weekIndex += 1
  }

  return indexes
}
