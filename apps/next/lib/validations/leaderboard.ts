export const leaderboardMetrics = [
  'strength',
  'relative_strength',
  'consistency',
  'streak',
  'volume',
  'most_improved',
] as const

export type LeaderboardMetric = (typeof leaderboardMetrics)[number]

export const leaderboardFormulas = ['dots', 'wilks'] as const

export type LeaderboardFormula = (typeof leaderboardFormulas)[number]

const legacyMetricMap: Record<string, LeaderboardMetric> = {
  e1rm: 'strength',
  top_set: 'strength',
  weekly_completion: 'consistency',
}

export function parseLeaderboardMetric(
  value: string | undefined
): LeaderboardMetric {
  if (value && leaderboardMetrics.includes(value as LeaderboardMetric)) {
    return value as LeaderboardMetric
  }
  if (value && legacyMetricMap[value]) {
    return legacyMetricMap[value]
  }
  return 'strength'
}

export function metricNeedsExercise(metric: LeaderboardMetric): boolean {
  return metric === 'strength' || metric === 'most_improved'
}

export function metricSupportsExercise(metric: LeaderboardMetric): boolean {
  return (
    metric === 'strength' ||
    metric === 'most_improved' ||
    metric === 'relative_strength'
  )
}

export function parseLeaderboardFormula(
  value: string | undefined
): LeaderboardFormula {
  if (value && leaderboardFormulas.includes(value as LeaderboardFormula)) {
    return value as LeaderboardFormula
  }
  return 'dots'
}

export const leaderboardPeriods = [
  'week',
  'month',
  'year',
  'all',
] as const

export type LeaderboardPeriod = (typeof leaderboardPeriods)[number]

export function parseLeaderboardPeriod(
  value: string | undefined,
  metric: LeaderboardMetric
): LeaderboardPeriod {
  if (value && leaderboardPeriods.includes(value as LeaderboardPeriod)) {
    return value as LeaderboardPeriod
  }
  if (metric === 'consistency') return 'week'
  if (metric === 'streak') return 'all'
  return 'month'
}

export function parseLeaderboardExerciseId(
  value: string | undefined
): string | null {
  if (!value?.trim()) return null
  return value.trim()
}

export function parseLeaderboardWeightClass(
  value: string | undefined
): string | null {
  if (!value?.trim() || value === 'all') return null
  return value.trim()
}
