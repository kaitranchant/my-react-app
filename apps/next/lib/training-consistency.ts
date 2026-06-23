import {
  addDaysToDateKey,
  getWeekStartDateKey,
  parseDateKey,
  toDateKey,
} from '@/lib/calendar'
import { fetchClientWorkouts } from '@/lib/load-queries'
import type { createClient } from '@/lib/supabase/server'
import type { ClientScheduledWorkout, WeekStartsOn } from 'app/types/database'

export const TRAINING_CONSISTENCY_DAYS = 365
export const COMPACT_HEATMAP_WEEKS = 12

export type TrainingConsistencyLevel = 0 | 1 | 2 | 3 | 4

export type TrainingConsistencyDay = {
  dateKey: string
  count: number
  missedCount: number
  missed: boolean
  level: TrainingConsistencyLevel
}

export type TrainingConsistencyMonthLabel = {
  weekIndex: number
  label: string
}

export type TrainingConsistencyHeatmap = {
  days: TrainingConsistencyDay[]
  weeks: (TrainingConsistencyDay | null)[][]
  monthLabels: TrainingConsistencyMonthLabel[]
  totalSessions: number
  activeDays: number
  missedDays: number
  longestStreak: number
}

export type WorkoutDayStats = {
  completed: number
  missed: number
}

export function sessionCountToLevel(count: number): TrainingConsistencyLevel {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

export function isMissedWorkout(
  workout: Pick<ClientScheduledWorkout, 'status' | 'scheduled_date'>,
  todayKey: string = toDateKey(new Date())
): boolean {
  if (workout.status === 'skipped') return true
  if (workout.status === 'scheduled' && workout.scheduled_date < todayKey) {
    return true
  }
  return false
}

export function buildWorkoutDayStats(
  workouts: Pick<ClientScheduledWorkout, 'status' | 'scheduled_date'>[],
  options?: { todayKey?: string }
): Map<string, WorkoutDayStats> {
  const todayKey = options?.todayKey ?? toDateKey(new Date())
  const statsByDate = new Map<string, WorkoutDayStats>()

  for (const workout of workouts) {
    const entry = statsByDate.get(workout.scheduled_date) ?? {
      completed: 0,
      missed: 0,
    }

    if (workout.status === 'completed') {
      entry.completed++
    } else if (isMissedWorkout(workout, todayKey)) {
      entry.missed++
    }

    statsByDate.set(workout.scheduled_date, entry)
  }

  return statsByDate
}

/** @deprecated Use buildWorkoutDayStats for missed-day support */
export function buildSessionsByDate(
  workouts: Pick<ClientScheduledWorkout, 'status' | 'scheduled_date'>[]
): Map<string, number> {
  const sessionsByDate = new Map<string, number>()

  for (const workout of workouts) {
    if (workout.status !== 'completed') continue
    sessionsByDate.set(
      workout.scheduled_date,
      (sessionsByDate.get(workout.scheduled_date) ?? 0) + 1
    )
  }

  return sessionsByDate
}

function getDayOfWeekIndex(date: Date, weekStartsOn: WeekStartsOn): number {
  const jsDay = date.getDay()
  if (weekStartsOn === 'sunday') return jsDay
  return jsDay === 0 ? 6 : jsDay - 1
}

function calcLongestStreak(days: TrainingConsistencyDay[]): number {
  let longest = 0
  let current = 0

  for (const day of days) {
    if (day.count > 0) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }

  return longest
}

function buildMonthLabels(
  weeks: (TrainingConsistencyDay | null)[][]
): TrainingConsistencyMonthLabel[] {
  const labels: TrainingConsistencyMonthLabel[] = []
  const seen = new Set<string>()

  weeks.forEach((week, weekIndex) => {
    for (const day of week) {
      if (!day) continue

      const date = parseDateKey(day.dateKey)
      if (date.getDate() !== 1) continue

      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      if (seen.has(monthKey)) break

      seen.add(monthKey)
      labels.push({
        weekIndex,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
      })
      break
    }
  })

  return labels
}

export function buildTrainingConsistencyHeatmap(
  dayStats: Map<string, WorkoutDayStats>,
  options?: {
    endDateKey?: string
    weekStartsOn?: WeekStartsOn
    totalDays?: number
  }
): TrainingConsistencyHeatmap {
  const endDateKey = options?.endDateKey ?? toDateKey(new Date())
  const weekStartsOn = options?.weekStartsOn ?? 'monday'
  const totalDays = options?.totalDays ?? TRAINING_CONSISTENCY_DAYS
  const rangeStartDateKey = addDaysToDateKey(endDateKey, -(totalDays - 1))
  const gridStartDateKey = getWeekStartDateKey(rangeStartDateKey, weekStartsOn)

  const days: TrainingConsistencyDay[] = []
  let cursor = gridStartDateKey

  while (cursor <= endDateKey) {
    const stats =
      cursor >= rangeStartDateKey ? dayStats.get(cursor) : undefined
    const count = stats?.completed ?? 0
    const missedCount = stats?.missed ?? 0

    days.push({
      dateKey: cursor,
      count,
      missedCount,
      missed: count === 0 && missedCount > 0,
      level: sessionCountToLevel(count),
    })
    cursor = addDaysToDateKey(cursor, 1)
  }

  const weeks: (TrainingConsistencyDay | null)[][] = []
  for (let index = 0; index < days.length; index += 7) {
    const weekDays = days.slice(index, index + 7)
    const column: (TrainingConsistencyDay | null)[] = Array.from(
      { length: 7 },
      () => null
    )

    for (const day of weekDays) {
      const dayIndex = getDayOfWeekIndex(parseDateKey(day.dateKey), weekStartsOn)
      column[dayIndex] = day
    }

    weeks.push(column)
  }

  const inRangeDays = days.filter((day) => day.dateKey >= rangeStartDateKey)
  const totalSessions = inRangeDays.reduce((sum, day) => sum + day.count, 0)
  const activeDays = inRangeDays.filter((day) => day.count > 0).length
  const missedDays = inRangeDays.filter((day) => day.missed).length

  return {
    days: inRangeDays,
    weeks,
    monthLabels: buildMonthLabels(weeks),
    totalSessions,
    activeDays,
    missedDays,
    longestStreak: calcLongestStreak(inRangeDays),
  }
}

export function sliceHeatmapWeeks(
  heatmap: TrainingConsistencyHeatmap,
  weekCount: number
): Pick<TrainingConsistencyHeatmap, 'weeks' | 'monthLabels'> {
  if (heatmap.weeks.length <= weekCount) {
    return {
      weeks: heatmap.weeks,
      monthLabels: heatmap.monthLabels,
    }
  }

  const startWeekIndex = heatmap.weeks.length - weekCount

  return {
    weeks: heatmap.weeks.slice(startWeekIndex),
    monthLabels: heatmap.monthLabels
      .filter((label) => label.weekIndex >= startWeekIndex)
      .map((label) => ({
        ...label,
        weekIndex: label.weekIndex - startWeekIndex,
      })),
  }
}

export function formatTrainingConsistencyDayLabel(
  day: TrainingConsistencyDay
): string {
  const date = parseDateKey(day.dateKey)
  const formatted = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (day.count === 0 && day.missedCount > 0) {
    if (day.missedCount === 1) {
      return `${formatted}: 1 missed session`
    }
    return `${formatted}: ${day.missedCount} missed sessions`
  }

  if (day.count === 0) return `${formatted}: No sessions`
  if (day.count === 1) return `${formatted}: 1 session completed`
  return `${formatted}: ${day.count} sessions completed`
}

export async function fetchTrainingConsistencyHeatmap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  weekStartsOn: WeekStartsOn = 'monday'
): Promise<TrainingConsistencyHeatmap> {
  const endDateKey = toDateKey(new Date())
  const startDateKey = addDaysToDateKey(
    endDateKey,
    -(TRAINING_CONSISTENCY_DAYS - 1)
  )
  const workouts = await fetchClientWorkouts(supabase, clientId, startDateKey)
  const dayStats = buildWorkoutDayStats(workouts, { todayKey: endDateKey })

  return buildTrainingConsistencyHeatmap(dayStats, {
    endDateKey,
    weekStartsOn,
  })
}
