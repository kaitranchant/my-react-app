import type { ClientCheckIn } from 'app/types/database'

export type CheckInTrendPoint = {
  dateKey: string
  label: string
  sleepHours: number | null
  energyLevel: number | null
  sorenessLevel: number | null
}

export type CheckInTrendMetricKey = 'sleepHours' | 'energyLevel' | 'sorenessLevel'

export type CheckInTrendMetric = {
  key: CheckInTrendMetricKey
  label: string
  unit: string
  color: string
  formatValue: (value: number) => string
}

export const CHECK_IN_TREND_METRICS: CheckInTrendMetric[] = [
  {
    key: 'sleepHours',
    label: 'Sleep',
    unit: 'hours',
    color: 'stroke-sky-500',
    formatValue: (value) => `${value}h`,
  },
  {
    key: 'energyLevel',
    label: 'Energy',
    unit: '/5',
    color: 'stroke-emerald-500',
    formatValue: (value) => `${value}/5`,
  },
  {
    key: 'sorenessLevel',
    label: 'Soreness',
    unit: '/5',
    color: 'stroke-amber-500',
    formatValue: (value) => `${value}/5`,
  },
]

function formatTrendDateLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function buildCheckInTrendPoints(
  checkIns: ClientCheckIn[],
  limit = 10
): CheckInTrendPoint[] {
  return [...checkIns]
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
    .slice(-limit)
    .map((checkIn) => ({
      dateKey: checkIn.check_in_date,
      label: formatTrendDateLabel(checkIn.check_in_date),
      sleepHours: checkIn.sleep_hours,
      energyLevel: checkIn.energy_level,
      sorenessLevel: checkIn.soreness_level,
    }))
}

export function getVisibleCheckInTrendMetrics(
  points: CheckInTrendPoint[]
): CheckInTrendMetric[] {
  return CHECK_IN_TREND_METRICS.filter((metric) =>
    points.some((point) => point[metric.key] != null)
  )
}

export function getCheckInTrendValue(
  point: CheckInTrendPoint,
  metric: CheckInTrendMetric
): number | null {
  return point[metric.key]
}

export type CheckInTrendBadgeVariant = 'success' | 'warning' | 'danger' | 'secondary'

export type CheckInTrendSummary = {
  metric: CheckInTrendMetric
  latestLabel: string
  badge: { label: string; variant: CheckInTrendBadgeVariant }
}

export function buildCheckInTrendSummaries(
  points: CheckInTrendPoint[]
): CheckInTrendSummary[] {
  if (points.length === 0) return []

  const metrics = getVisibleCheckInTrendMetrics(points)
  const latestPoint = points[points.length - 1]!
  const previousPoint = points.length >= 2 ? points[points.length - 2]! : null

  return metrics.map((metric) => {
    const latest = getCheckInTrendValue(latestPoint, metric)
    const previous = previousPoint
      ? getCheckInTrendValue(previousPoint, metric)
      : null
    const latestLabel = latest != null ? metric.formatValue(latest) : '—'

    let badge: CheckInTrendSummary['badge']
    if (latest == null) {
      badge = { label: 'No data', variant: 'secondary' }
    } else if (metric.key === 'sorenessLevel') {
      if (latest >= 4) {
        badge = { label: '↑ high', variant: 'danger' }
      } else if (previous != null && latest > previous) {
        badge = { label: '↑ rising', variant: 'warning' }
      } else if (previous != null && latest < previous) {
        badge = { label: '↓ easing', variant: 'success' }
      } else {
        badge = { label: 'steady', variant: 'secondary' }
      }
    } else if (previous == null) {
      badge = { label: 'logged', variant: 'secondary' }
    } else if (latest > previous) {
      badge = { label: '↑ improving', variant: 'success' }
    } else if (latest < previous) {
      badge = { label: '↓ declining', variant: 'danger' }
    } else {
      badge = { label: 'steady', variant: 'secondary' }
    }

    return { metric, latestLabel, badge }
  })
}
