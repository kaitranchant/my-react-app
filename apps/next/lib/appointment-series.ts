export const ONGOING_SERIES_MIN_HORIZON_DAYS = 84
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

export function computeSeriesHorizonDays(bookingMaxDaysAhead: number) {
  return Math.max(bookingMaxDaysAhead, ONGOING_SERIES_MIN_HORIZON_DAYS)
}

export function getSeriesHorizonEnd(from: Date, horizonDays: number) {
  const end = new Date(from)
  end.setDate(end.getDate() + horizonDays)
  return end
}

export function offsetStartsAtByWeeks(anchorStartsAtIso: string, weekIndex: number) {
  const startsAt = new Date(anchorStartsAtIso)
  startsAt.setDate(startsAt.getDate() + weekIndex * 7)
  return startsAt.toISOString()
}

export function getWeekIndexFromAnchor(
  anchorStartsAtIso: string,
  startsAtIso: string
) {
  const anchor = new Date(anchorStartsAtIso).getTime()
  const startsAt = new Date(startsAtIso).getTime()
  return Math.round((startsAt - anchor) / MS_PER_WEEK)
}

export function isSeriesOccurrenceAtOrAfterWeek(
  anchorStartsAtIso: string,
  startsAtIso: string,
  fromWeekIndex: number,
  maxWeekIndex: number | null = null
) {
  const weekIndex = getWeekIndexFromAnchor(anchorStartsAtIso, startsAtIso)
  if (weekIndex < fromWeekIndex) return false
  if (maxWeekIndex != null && weekIndex > maxWeekIndex) return false
  return true
}

export function isOrphanSeriesOccurrenceAtOrAfterWeek(
  anchorStartsAtIso: string,
  startsAtIso: string,
  fromWeekIndex: number,
  maxWeekIndex: number | null = null
) {
  const weekIndex = getWeekIndexFromAnchor(anchorStartsAtIso, startsAtIso)
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
