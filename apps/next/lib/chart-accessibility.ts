import {
  formatMetricDelta,
  formatMetricValue,
  type LoadMetric,
  type WeeklyMetricBucket,
} from '@/lib/load-analytics'
import { formatStrengthE1rm } from '@/lib/strength-history'
import type { StrengthHistoryTrend } from '@/lib/strength-history'
import type { TrainingConsistencyHeatmap } from '@/lib/training-consistency'
import type { WeightUnit } from 'app/types/database'

export function buildStrengthChartSummary(
  exerciseName: string,
  trend: StrengthHistoryTrend,
  weightUnit: WeightUnit
): string {
  const definedPoints = trend.points.filter((point) => point.e1rm != null)

  if (definedPoints.length === 0) {
    return `No strength history recorded for ${exerciseName} yet.`
  }

  const parts: string[] = []

  if (trend.currentE1rm != null) {
    parts.push(
      `Current best for ${exerciseName} is ${formatStrengthE1rm(trend.currentE1rm, weightUnit)}.`
    )
  }

  if (trend.changeLabel) {
    parts.push(trend.changeLabel + '.')
  }

  const dataSummary = definedPoints
    .map((point) => `${point.label}: ${formatStrengthE1rm(point.e1rm!, weightUnit)}`)
    .join('; ')

  parts.push(`Monthly peaks: ${dataSummary}.`)

  return parts.join(' ')
}

export function buildVolumeChartSummary(
  buckets: WeeklyMetricBucket[],
  metric: LoadMetric,
  weightUnit: WeightUnit,
  metricLabel = 'volume'
): string {
  const activeBuckets = buckets.filter((bucket) => bucket.value > 0)

  if (activeBuckets.length === 0) {
    return `No ${metricLabel} recorded in the last ${buckets.length} weeks.`
  }

  const latest = activeBuckets[activeBuckets.length - 1]
  const previous =
    activeBuckets.length > 1
      ? activeBuckets[activeBuckets.length - 2]
      : null

  const latestLabel = formatWeekLabel(latest.weekStart)
  const latestValue = formatMetricValue(metric, latest.value, weightUnit)

  const parts = [
    `${metricLabel} chart covering ${buckets.length} weeks.`,
    `Most recent week (${latestLabel}): ${latestValue}.`,
  ]

  if (previous) {
    parts.push(
      `Compared to prior week (${formatWeekLabel(previous.weekStart)}): ${formatMetricDelta(metric, latest.value, previous.value, weightUnit)}.`
    )
  }

  const peak = activeBuckets.reduce((best, bucket) =>
    bucket.value > best.value ? bucket : best
  )
  parts.push(
    `Peak week was ${formatWeekLabel(peak.weekStart)} at ${formatMetricValue(metric, peak.value, weightUnit)}.`
  )

  return parts.join(' ')
}

export function buildHeatmapSummary(heatmap: TrainingConsistencyHeatmap): string {
  if (heatmap.totalSessions === 0) {
    return 'No completed workouts in this training history period yet.'
  }

  const parts = [
    `${heatmap.totalSessions} completed session${heatmap.totalSessions === 1 ? '' : 's'} across ${heatmap.activeDays} active day${heatmap.activeDays === 1 ? '' : 's'}.`,
  ]

  if (heatmap.longestStreak > 0) {
    parts.push(
      `Longest streak: ${heatmap.longestStreak} day${heatmap.longestStreak === 1 ? '' : 's'}.`
    )
  }

  if (heatmap.missedDays > 0) {
    parts.push(
      `${heatmap.missedDays} missed scheduled day${heatmap.missedDays === 1 ? '' : 's'}.`
    )
  }

  return parts.join(' ')
}

function formatWeekLabel(weekStart: string): string {
  return new Date(`${weekStart}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
