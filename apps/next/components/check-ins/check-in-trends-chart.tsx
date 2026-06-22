'use client'

import { cn } from '@/lib/utils'
import {
  buildCheckInTrendSummaries,
  getCheckInTrendValue,
  getVisibleCheckInTrendMetrics,
  type CheckInTrendBadgeVariant,
  type CheckInTrendMetric,
  type CheckInTrendPoint,
} from '@/lib/check-in-trends'
import { Badge } from '@/components/ui/badge'
import { statusSoftBadgeClass, type StatusLevel } from '@/lib/status-colors'

type CheckInTrendsChartProps = {
  points: CheckInTrendPoint[]
  className?: string
}

function buildSparklinePath(
  values: Array<number | null>,
  width: number,
  height: number
): string | null {
  const defined = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value != null)

  if (defined.length === 0) return null

  const paddingX = 4
  const paddingY = 6
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const numericValues = defined.map((entry) => entry.value)
  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1
  const totalPoints = values.length

  return defined
    .map(({ value, index }, segmentIndex) => {
      const x =
        totalPoints === 1
          ? width / 2
          : paddingX + (index / (totalPoints - 1)) * innerWidth
      const y = paddingY + innerHeight - ((value - min) / range) * innerHeight
      return `${segmentIndex === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function MetricSparkline({
  metric,
  points,
}: {
  metric: CheckInTrendMetric
  points: CheckInTrendPoint[]
}) {
  const width = 160
  const height = 40
  const values = points.map((point) => getCheckInTrendValue(point, metric))
  const path = buildSparklinePath(values, width, height)
  const defined = values.filter((value): value is number => value != null)

  if (!path || defined.length < 2) return null

  const paddingX = 4
  const paddingY = 6
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const min = Math.min(...defined)
  const max = Math.max(...defined)
  const range = max - min || 1
  const totalPoints = values.length

  const dots = values
    .map((value, index) => {
      if (value == null) return null
      const x =
        totalPoints === 1
          ? width / 2
          : paddingX + (index / (totalPoints - 1)) * innerWidth
      const y = paddingY + innerHeight - ((value - min) / range) * innerHeight
      return { x, y, index }
    })
    .filter((dot): dot is { x: number; y: number; index: number } => dot != null)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-10 w-full max-w-[10rem]"
      role="img"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        className={cn(metric.color, 'opacity-90')}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dots.map((dot) => (
        <circle
          key={`${metric.key}-${dot.index}`}
          cx={dot.x}
          cy={dot.y}
          r="2.5"
          className={cn(metric.color.replace('stroke-', 'fill-'))}
        />
      ))}
    </svg>
  )
}

function CheckInTrendsTable({
  metrics,
  points,
}: {
  metrics: CheckInTrendMetric[]
  points: CheckInTrendPoint[]
}) {
  const showSparklines = points.length >= 3

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[16rem] border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-muted-foreground w-28 pb-2 text-left text-xs font-normal">
              Metric
            </th>
            {points.map((point) => (
              <th
                key={point.dateKey}
                className="text-muted-foreground px-2 pb-2 text-center text-xs font-normal"
              >
                {point.label}
              </th>
            ))}
            {showSparklines ? (
              <th className="text-muted-foreground w-28 pb-2 text-right text-xs font-normal">
                Trend
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.key} className="border-b last:border-b-0">
              <td className="text-muted-foreground py-3 pr-3 align-middle text-xs">
                <span className="text-foreground font-medium">{metric.label}</span>
                <span className="text-muted-foreground/80 block text-[11px]">
                  {metric.unit}
                </span>
              </td>
              {points.map((point) => {
                const value = getCheckInTrendValue(point, metric)
                return (
                  <td
                    key={point.dateKey}
                    className="px-2 py-3 text-center align-middle tabular-nums font-medium"
                  >
                    {value != null ? metric.formatValue(value) : '—'}
                  </td>
                )
              })}
              {showSparklines ? (
                <td className="py-2 pl-2 text-right align-middle">
                  <MetricSparkline metric={metric} points={points} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function trendBadgeClass(variant: CheckInTrendBadgeVariant): string {
  if (variant === 'secondary') {
    return 'border-border bg-muted/50 text-muted-foreground'
  }
  return statusSoftBadgeClass[variant as StatusLevel]
}

export function CheckInTrendsSummary({
  points,
  className,
}: CheckInTrendsChartProps) {
  const summaries = buildCheckInTrendSummaries(points)

  if (summaries.length === 0) {
    return (
      <p className={cn('text-muted-foreground text-sm leading-relaxed', className)}>
        Check-in trends appear here once sleep, energy, or soreness is logged.
      </p>
    )
  }

  return (
    <ul className={cn('divide-y', className)}>
      {summaries.map(({ metric, latestLabel, badge }) => (
        <li
          key={metric.key}
          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <span className="text-sm font-medium">{metric.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums">{latestLabel}</span>
            <Badge
              variant="outline"
              className={cn('h-6 px-2 text-[11px] font-medium', trendBadgeClass(badge.variant))}
            >
              {badge.label}
            </Badge>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function CheckInTrendsChart({ points, className }: CheckInTrendsChartProps) {
  const metrics = getVisibleCheckInTrendMetrics(points)

  if (points.length === 0 || metrics.length === 0) {
    return (
      <p className={cn('text-muted-foreground text-sm leading-relaxed', className)}>
        Check-in trends appear here once sleep, energy, or soreness is logged.
      </p>
    )
  }

  return (
    <div className={cn(className)}>
      <CheckInTrendsTable metrics={metrics} points={points} />
    </div>
  )
}
