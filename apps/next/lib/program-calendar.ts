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

export const MAX_PROGRAM_WEEK_INDEX = Math.floor(
  MAX_PROGRAM_DAY_OFFSET / DAYS_PER_PROGRAM_WEEK
)

export const MAX_PROGRAM_WEEK_NUMBER = MAX_PROGRAM_WEEK_INDEX + 1

export function weekNumberToIndex(weekNumber: number): number {
  return weekNumber - 1
}

export function weekIndexToNumber(weekIndex: number): number {
  return weekIndex + 1
}

export function getTargetDayOffsetForWeekCopy(
  sourceDayOffset: number,
  targetWeekIndex: number
): number {
  const normalizedOffset = Number(sourceDayOffset)
  if (!Number.isFinite(normalizedOffset)) {
    return Number.NaN
  }

  const dayInWeek =
    ((normalizedOffset % DAYS_PER_PROGRAM_WEEK) + DAYS_PER_PROGRAM_WEEK) %
    DAYS_PER_PROGRAM_WEEK

  return targetWeekIndex * DAYS_PER_PROGRAM_WEEK + dayInWeek
}

export function countWeeksInRange(
  startWeekIndex: number,
  endWeekIndex: number,
  options?: { excludeWeekIndex?: number }
): number {
  if (startWeekIndex > endWeekIndex) return 0

  let count = 0
  for (let weekIndex = startWeekIndex; weekIndex <= endWeekIndex; weekIndex++) {
    if (weekIndex === options?.excludeWeekIndex) continue
    count++
  }
  return count
}

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

export function getWeekIndexForDayOffset(dayOffset: number): number {
  return Math.floor(dayOffset / DAYS_PER_PROGRAM_WEEK)
}

export type ProgramPhaseRange = {
  id?: string
  start_day_offset: number
  end_day_offset: number
}

export function getPhaseForDayOffset<T extends ProgramPhaseRange>(
  phases: T[],
  dayOffset: number
): T | null {
  return (
    phases.find(
      (phase) =>
        dayOffset >= phase.start_day_offset && dayOffset <= phase.end_day_offset
    ) ?? null
  )
}

export function phaseRangesOverlap(
  startOffset: number,
  endOffset: number,
  existing: ProgramPhaseRange[],
  excludePhaseId?: string
): boolean {
  return existing.some((phase) => {
    if (excludePhaseId && phase.id === excludePhaseId) return false
    return startOffset <= phase.end_day_offset && endOffset >= phase.start_day_offset
  })
}

export function formatPhaseDayRange(
  phase: Pick<ProgramPhaseRange, 'start_day_offset' | 'end_day_offset'>
): string {
  return `${formatProgramDayLabel(phase.start_day_offset)} – ${formatProgramDayLabel(phase.end_day_offset)}`
}

export function formatPhaseDuration(
  phase: Pick<ProgramPhaseRange, 'start_day_offset' | 'end_day_offset'>
): string {
  const days = phase.end_day_offset - phase.start_day_offset + 1
  const weeks = Math.ceil(days / DAYS_PER_PROGRAM_WEEK)
  if (weeks === 1) return '1 week'
  return `${weeks} weeks`
}

export function suggestNextPhaseStartOffset(phases: ProgramPhaseRange[]): number {
  if (phases.length === 0) return 0
  const maxEnd = Math.max(...phases.map((phase) => phase.end_day_offset))
  return Math.min(maxEnd + 1, MAX_PROGRAM_DAY_OFFSET)
}
