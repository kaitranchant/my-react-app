const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Mon–Sun labels mapped to JavaScript `Date.getDay()` values (0 = Sun … 6 = Sat). */
export const WEEKDAY_OPTIONS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
] as const

export const ALL_WEEKDAY_VALUES = WEEKDAY_OPTIONS.map((day) => day.value)
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function coerceDateKey(value: unknown): string | null {
  if (value == null) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return toDateKey(value)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed
    }

    const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoPrefix) {
      return isoPrefix[1]
    }
  }

  return null
}

export function parseDateKey(value: string | Date): Date {
  const key = coerceDateKey(value)
  if (!key) {
    return new Date(Number.NaN)
  }

  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDayHeader(
  dateKey: string | Date | null | undefined
): string {
  const key = coerceDateKey(dateKey)
  if (!key) return '—'

  const date = parseDateKey(key)
  if (Number.isNaN(date.getTime())) return '—'

  const day = date.getDate()
  const weekday = WEEKDAY_LABELS[date.getDay()]
  return `${day} ${weekday}`
}

export function formatMonthYear(year: number, month: number): string {
  return `${MONTH_LABELS[month]} ${year}`
}

export function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(new Date())

  const cells: Array<{
    dateKey: string | null
    day: number | null
    isToday: boolean
  }> = []

  for (let i = 0; i < startOffset; i++) {
    cells.push({ dateKey: null, day: null, isToday: false })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(new Date(year, month, day))
    cells.push({
      dateKey,
      day,
      isToday: dateKey === todayKey,
    })
  }

  return cells
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function getMonthDateRange(year: number, month: number) {
  const start = toDateKey(new Date(year, month, 1))
  const end = toDateKey(new Date(year, month + 1, 0))
  return { start, end }
}

export function formatPrescription(
  sets: string | null,
  reps: string | null,
  prescription: string | null
): string {
  const parts: string[] = []
  if (sets?.trim() && reps?.trim()) {
    parts.push(`${sets.trim()} x ${reps.trim()}`)
  } else if (sets?.trim()) {
    parts.push(sets.trim())
  } else if (reps?.trim()) {
    parts.push(reps.trim())
  }
  if (prescription?.trim()) {
    parts.push(prescription.trim())
  }
  return parts.join(' · ') || 'No prescription set'
}

import type { WeekStartsOn } from 'app/types/database'

export function getWeekStartDateKey(
  dateKey: string,
  weekStartsOn: WeekStartsOn = 'monday'
): string {
  return getCurrentWeekDateKeys(weekStartsOn, parseDateKey(dateKey))[0]!
}

export function getCurrentWeekDateKeys(
  weekStartsOn: WeekStartsOn = 'monday',
  referenceDate = new Date()
): string[] {
  const dayIndex = referenceDate.getDay()
  const startOffset =
    weekStartsOn === 'monday'
      ? dayIndex === 0
        ? -6
        : 1 - dayIndex
      : -dayIndex

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(referenceDate)
    date.setDate(referenceDate.getDate() + startOffset + index)
    return toDateKey(date)
  })
}

export function addDaysToDateKey(dateKey: string | Date, days: number): string {
  const key = coerceDateKey(dateKey)
  if (!key) return toDateKey(new Date())

  const date = parseDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function getMatchingDatesInRange(
  startDateKey: string,
  endDateKey: string,
  weekdays: number[],
  options?: { excludeDates?: string[] }
): string[] {
  const start = parseDateKey(startDateKey)
  const end = parseDateKey(endDateKey)
  if (start > end) {
    return []
  }

  const weekdaySet = new Set(weekdays)
  const excludeSet = new Set(options?.excludeDates ?? [])
  const dates: string[] = []
  const current = new Date(start)

  while (current <= end) {
    if (weekdaySet.has(current.getDay())) {
      const key = toDateKey(current)
      if (!excludeSet.has(key)) {
        dates.push(key)
      }
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function getWeekDayLabels(
  weekStartsOn: WeekStartsOn = 'monday',
  referenceDate = new Date()
): { label: string; dateKey: string; isToday: boolean }[] {
  const todayKey = toDateKey(new Date())
  const labels =
    weekStartsOn === 'monday'
      ? (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const)
      : (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const)

  return getCurrentWeekDateKeys(weekStartsOn, referenceDate).map(
    (dateKey, index) => ({
      label: labels[index]!,
      dateKey,
      isToday: dateKey === todayKey,
    })
  )
}
