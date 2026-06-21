import {
  Activity,
  Flame,
  Scale,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import { getWeekDayLabels, toDateKey } from '@/lib/calendar'
import { formatVolume } from '@/lib/coach-preferences'
import type { LeaderboardMetric, LeaderboardPeriod } from '@/lib/validations/leaderboard'
import type { WeekStartsOn, WeightUnit } from 'app/types/database'

export type LeaderboardMetricConfig = {
  id: LeaderboardMetric
  label: string
  shortLabel: string
  description: string
  needsExercise: boolean
  valueLabel: string
  icon: LucideIcon
  supportsPeriod: boolean
}

export const LEADERBOARD_METRICS: LeaderboardMetricConfig[] = [
  {
    id: 'strength',
    label: 'Strength',
    shortLabel: 'Strength',
    description: 'Best estimated 1RM for a lift in the selected period.',
    needsExercise: true,
    valueLabel: 'e1RM',
    icon: Trophy,
    supportsPeriod: true,
  },
  {
    id: 'relative_strength',
    label: 'Wilks / DOTS',
    shortLabel: 'Wilks / DOTS',
    description:
      'Bodyweight-normalized strength score from a lift or powerlifting total.',
    needsExercise: false,
    valueLabel: 'Score',
    icon: Scale,
    supportsPeriod: true,
  },
  {
    id: 'consistency',
    label: 'Consistency',
    shortLabel: 'Consistency',
    description: 'Completed vs planned sessions in the selected period.',
    needsExercise: false,
    valueLabel: 'Completion',
    icon: Activity,
    supportsPeriod: true,
  },
  {
    id: 'streak',
    label: 'Streak',
    shortLabel: 'Streak',
    description: 'Consecutive days with a completed workout.',
    needsExercise: false,
    valueLabel: 'Streak',
    icon: Flame,
    supportsPeriod: false,
  },
  {
    id: 'volume',
    label: 'Volume',
    shortLabel: 'Volume',
    description: 'Total weight lifted across all logged sets.',
    needsExercise: false,
    valueLabel: 'Volume',
    icon: Activity,
    supportsPeriod: true,
  },
  {
    id: 'most_improved',
    label: 'Most improved',
    shortLabel: 'Most improved',
    description: 'Biggest percentage gain on a lift vs your prior best.',
    needsExercise: true,
    valueLabel: 'Improvement',
    icon: TrendingUp,
    supportsPeriod: true,
  },
]

export type LeaderboardPeriodConfig = {
  id: LeaderboardPeriod
  label: string
}

export const LEADERBOARD_PERIODS: LeaderboardPeriodConfig[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
]

export type LeaderboardRankChange = 'new' | 'up' | 'down' | 'same'

export type LeaderboardRowData = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  value: number | null
  displayValue: string
  detail: string | null
  weightClass: string | null
  achievedAt: string | null
  trendValues: number[]
}

export type LeaderboardRow = LeaderboardRowData & {
  rank: number | null
  rankChange: LeaderboardRankChange | null
  rankDelta: number | null
}

export type LeaderboardPeriodBounds = {
  start: string | null
  end: string
  previousStart: string | null
  previousEnd: string | null
  label: string
}

export function getLeaderboardPeriodBounds(
  period: LeaderboardPeriod,
  weekStartsOn: WeekStartsOn = 'monday',
  referenceDate: Date = new Date()
): LeaderboardPeriodBounds {
  const today = toDateKey(referenceDate)
  const end = today

  if (period === 'all') {
    return {
      start: null,
      end,
      previousStart: null,
      previousEnd: shiftDateKey(today, -28),
      label: 'All time',
    }
  }

  if (period === 'week') {
    const weekDays = getWeekDayLabels(weekStartsOn, referenceDate)
    const start = weekDays[0]?.dateKey ?? today
    const weekEnd = weekDays[6]?.dateKey ?? today
    const previousEnd = shiftDateKey(start, -1)
    const previousStart = shiftDateKey(previousEnd, -6)

    return {
      start,
      end: weekEnd,
      previousStart,
      previousEnd,
      label: 'This week',
    }
  }

  if (period === 'month') {
    const start = `${today.slice(0, 7)}-01`
    const previousMonthDate = new Date(`${start}T12:00:00`)
    previousMonthDate.setDate(0)
    const previousEnd = toDateKey(previousMonthDate)
    const previousStart = `${previousEnd.slice(0, 7)}-01`

    return {
      start,
      end,
      previousStart,
      previousEnd,
      label: 'This month',
    }
  }

  const start = `${today.slice(0, 4)}-01-01`
  const previousYear = Number.parseInt(today.slice(0, 4), 10) - 1
  const previousStart = `${previousYear}-01-01`
  const previousEnd = `${previousYear}-12-31`

  return {
    start,
    end,
    previousStart,
    previousEnd,
    label: 'This year',
  }
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function rankLeaderboardRows(
  rows: LeaderboardRowData[]
): LeaderboardRow[] {
  const sorted = [...rows].sort((left, right) => {
    if (left.value == null && right.value == null) {
      return left.clientName.localeCompare(right.clientName)
    }
    if (left.value == null) return 1
    if (right.value == null) return -1
    if (right.value !== left.value) return right.value - left.value
    return left.clientName.localeCompare(right.clientName)
  })

  let rank = 0
  let seen = 0
  let previousValue: number | null | undefined

  return sorted.map((row) => {
    seen += 1
    if (row.value == null) {
      return { ...row, rank: null, rankChange: null, rankDelta: null }
    }
    if (previousValue == null || row.value !== previousValue) {
      rank = seen
      previousValue = row.value
    }
    return { ...row, rank, rankChange: null, rankDelta: null }
  })
}

export function applyLeaderboardRankChanges(
  rows: LeaderboardRow[],
  previousRows: LeaderboardRow[]
): LeaderboardRow[] {
  const previousRankByClientId = new Map<string, number>()

  for (const row of previousRows) {
    if (row.rank != null) {
      previousRankByClientId.set(row.clientId, row.rank)
    }
  }

  return rows.map((row) => {
    if (row.rank == null) {
      return { ...row, rankChange: null, rankDelta: null }
    }

    const previousRank = previousRankByClientId.get(row.clientId)
    if (previousRank == null) {
      return { ...row, rankChange: 'new' as const, rankDelta: null }
    }

    const delta = previousRank - row.rank
    if (delta > 0) {
      return { ...row, rankChange: 'up' as const, rankDelta: delta }
    }
    if (delta < 0) {
      return { ...row, rankChange: 'down' as const, rankDelta: Math.abs(delta) }
    }
    return { ...row, rankChange: 'same' as const, rankDelta: 0 }
  })
}

export function formatLeaderboardE1rm(
  value: number,
  weightUnit: WeightUnit
): string {
  return formatVolume(value, weightUnit)
}

export function formatLeaderboardVolume(
  value: number,
  weightUnit: WeightUnit
): string {
  return formatVolume(value, weightUnit)
}

export function formatLeaderboardCompletion(value: number): string {
  return `${Math.round(value)}%`
}

export function formatLeaderboardStreak(value: number): string {
  if (value === 1) return '1 day'
  return `${value} days`
}

export function formatLeaderboardImprovement(value: number): string {
  return `+${Math.round(value)}%`
}

export { formatRelativeStrengthScore } from '@/lib/strength-coefficients'

export function getLeaderboardMetricConfig(
  metric: LeaderboardMetric
): LeaderboardMetricConfig {
  return (
    LEADERBOARD_METRICS.find((entry) => entry.id === metric) ??
    LEADERBOARD_METRICS[0]
  )
}

const DEFAULT_EXERCISE_NAME_PATTERNS = [
  /back squat/i,
  /barbell back squat/i,
  /^squat$/i,
  /bench press/i,
  /deadlift/i,
  /conventional deadlift/i,
]

const SQUAT_EXERCISE_PATTERNS = [
  /back squat/i,
  /barbell back squat/i,
  /^squat$/i,
]

const BENCH_EXERCISE_PATTERNS = [/bench press/i, /^bench$/i]

const DEADLIFT_EXERCISE_PATTERNS = [/deadlift/i, /conventional deadlift/i]

function pickExerciseIdByPatterns(
  exercises: { id: string; name: string }[],
  patterns: RegExp[]
): string | null {
  for (const pattern of patterns) {
    const match = exercises.find((exercise) => pattern.test(exercise.name))
    if (match) return match.id
  }
  return null
}

export type PowerliftingExerciseIds = {
  squatId: string | null
  benchId: string | null
  deadliftId: string | null
}

export function pickPowerliftingExerciseIds(
  exercises: { id: string; name: string }[]
): PowerliftingExerciseIds {
  return {
    squatId: pickExerciseIdByPatterns(exercises, SQUAT_EXERCISE_PATTERNS),
    benchId: pickExerciseIdByPatterns(exercises, BENCH_EXERCISE_PATTERNS),
    deadliftId: pickExerciseIdByPatterns(exercises, DEADLIFT_EXERCISE_PATTERNS),
  }
}

export function pickDefaultExerciseIdFromNames(
  exercises: { id: string; name: string }[]
): string | null {
  if (exercises.length === 0) return null

  for (const pattern of DEFAULT_EXERCISE_NAME_PATTERNS) {
    const match = exercises.find((exercise) => pattern.test(exercise.name))
    if (match) return match.id
  }

  return exercises[0]?.id ?? null
}

export function formatRankChangeLabel(
  rankChange: LeaderboardRankChange | null,
  rankDelta: number | null
): string | null {
  if (rankChange === 'new') return 'NEW'
  if (rankChange === 'same') return '—'
  if (rankChange === 'up' && rankDelta != null) return `↑${rankDelta}`
  if (rankChange === 'down' && rankDelta != null) return `↓${rankDelta}`
  return null
}

export function getTopThreeRowClassName(rank: number | null): string {
  if (rank === 1) {
    return 'bg-amber-500/10 border-l-2 border-l-amber-500'
  }
  if (rank === 2) {
    return 'bg-slate-400/10 border-l-2 border-l-slate-400'
  }
  if (rank === 3) {
    return 'bg-orange-700/10 border-l-2 border-l-orange-600'
  }
  return ''
}
