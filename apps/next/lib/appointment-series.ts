import { parseDateKey } from '@/lib/calendar'
import {
  resolveSchedulingIana,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import { getDateKeyFromInstant } from '@/lib/session-booking-slots'

export type SeriesScheduleContext = {
  timezone: CoachPreferences['timezone']
  clientTimeZone?: string | null
}

/** Rolling booking window for indefinite weekly series (shown in app + Google Calendar). */
export const ONGOING_SERIES_MIN_HORIZON_DAYS = 365
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

function schedulingIana(schedule?: SeriesScheduleContext) {
  if (!schedule) return null
  const timezone = schedule.timezone
  if (typeof timezone === 'string' && timezone.includes('/')) {
    return timezone
  }
  return resolveSchedulingIana(
    timezone as CoachPreferences['timezone'],
    schedule.clientTimeZone
  )
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  let hour = read('hour')
  if (hour === 24) hour = 0

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour,
    minute: read('minute'),
    second: read('second'),
  }
}

function zonedOffsetMs(date: Date, timeZone: string) {
  const parts = zonedParts(date, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )
  return asUtc - date.getTime()
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  timeZone: string
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const offset = zonedOffsetMs(new Date(utcGuess), timeZone)
  let utc = utcGuess - offset
  const corrected = zonedOffsetMs(new Date(utc), timeZone)
  if (corrected !== offset) {
    utc = utcGuess - corrected
  }
  return new Date(utc)
}

function shiftInstantByWeeks(
  startsAtIso: string,
  weekIndex: number,
  schedule?: SeriesScheduleContext
) {
  if (weekIndex === 0) return startsAtIso

  const timeZone = schedulingIana(schedule)
  const startsAt = new Date(startsAtIso)
  if (!timeZone) {
    startsAt.setUTCDate(startsAt.getUTCDate() + weekIndex * 7)
    return startsAt.toISOString()
  }

  const parts = zonedParts(startsAt, timeZone)
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + weekIndex * 7)
  )
  return zonedDateTimeToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
    parts.hour,
    parts.minute,
    parts.second,
    startsAt.getMilliseconds(),
    timeZone
  ).toISOString()
}

export function offsetStartsAtByWeeks(
  anchorStartsAtIso: string,
  weekIndex: number,
  schedule?: SeriesScheduleContext
) {
  return shiftInstantByWeeks(anchorStartsAtIso, weekIndex, schedule)
}

export function subtractStartsAtByWeeks(
  startsAtIso: string,
  weekIndex: number,
  schedule?: SeriesScheduleContext
) {
  return shiftInstantByWeeks(startsAtIso, -weekIndex, schedule)
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
  return (
    new Date(startsAtIso).getTime() ===
    new Date(
      offsetStartsAtByWeeks(anchorStartsAtIso, weekIndex, schedule)
    ).getTime()
  )
}

export function countWeekIndexesThroughHorizon(
  anchorStartsAtIso: string,
  horizonEnd: Date,
  schedule?: SeriesScheduleContext
) {
  const indexes: number[] = []
  let weekIndex = 0

  while (true) {
    const startsAt = new Date(
      offsetStartsAtByWeeks(anchorStartsAtIso, weekIndex, schedule)
    )
    if (startsAt > horizonEnd) break
    indexes.push(weekIndex)
    weekIndex += 1
  }

  return indexes
}
