export const DAYS_PER_PROGRAM_WEEK = 7

/** Sun–Sat column order used by the program week grid (JS weekday: 0=Sun … 6=Sat). */
const PROGRAM_GRID_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

export const PROGRAM_WEEKDAY_HEADERS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const

export const MAX_PROGRAM_DAY_OFFSET = 364

export function getWeekDayOffsets(weekIndex: number): number[] {
  const start = weekIndex * DAYS_PER_PROGRAM_WEEK
  return Array.from({ length: DAYS_PER_PROGRAM_WEEK }, (_, index) => start + index)
}

export function formatProgramDayLabel(dayOffset: number): string {
  return `Day ${dayOffset + 1}`
}

export function formatProgramWeekLabel(weekIndex: number): string {
  return `Week ${weekIndex + 1}`
}

export function getMaxWeekIndexForOffsets(dayOffsets: number[]): number {
  if (dayOffsets.length === 0) return 0
  const maxOffset = Math.max(...dayOffsets)
  return Math.floor(maxOffset / DAYS_PER_PROGRAM_WEEK)
}

export function getDefaultProgramStartDate(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getProgramDayWeekday(dayOffset: number): number {
  return PROGRAM_GRID_WEEKDAYS[dayOffset % DAYS_PER_PROGRAM_WEEK]
}

export function dayNumberToOffset(dayNumber: number): number {
  return dayNumber - 1
}

export function offsetToDayNumber(dayOffset: number): number {
  return dayOffset + 1
}

export function getMatchingDayOffsetsInRange(
  startDayOffset: number,
  endDayOffset: number,
  weekdays: number[],
  options?: { excludeOffsets?: number[] }
): number[] {
  if (startDayOffset > endDayOffset) {
    return []
  }

  const weekdaySet = new Set(weekdays)
  const excludeSet = new Set(options?.excludeOffsets ?? [])
  const offsets: number[] = []

  for (let offset = startDayOffset; offset <= endDayOffset; offset++) {
    if (!weekdaySet.has(getProgramDayWeekday(offset))) continue
    if (excludeSet.has(offset)) continue
    offsets.push(offset)
  }

  return offsets
}
