import type { CalendarDaySummary } from 'app/types/database'

export function getSummariesForDate(
  days: CalendarDaySummary[],
  dateKey: string
): CalendarDaySummary[] {
  return days.filter((day) => day.scheduled_date === dateKey)
}

export function groupSummariesByDate(
  days: CalendarDaySummary[]
): Map<string, CalendarDaySummary[]> {
  const grouped = new Map<string, CalendarDaySummary[]>()

  for (const day of days) {
    const existing = grouped.get(day.scheduled_date)
    if (existing) {
      existing.push(day)
      continue
    }
    grouped.set(day.scheduled_date, [day])
  }

  return grouped
}

export function pickSummaryForDate(
  summaries: CalendarDaySummary[],
  preferredWorkoutId?: string | null
): CalendarDaySummary | undefined {
  if (summaries.length === 0) {
    return undefined
  }

  if (preferredWorkoutId) {
    const preferred = summaries.find((summary) => summary.id === preferredWorkoutId)
    if (preferred) {
      return preferred
    }
  }

  return summaries[0]
}
