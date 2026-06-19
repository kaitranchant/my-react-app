'use client'

import { cn } from '@/lib/utils'
import {
  getVisibleInbodyChartMetrics,
  type InbodyChartMetric,
  type InbodyChartPoint,
} from '@/lib/inbody-scans'

type InbodyCompositionHistoryChartProps = {
  points: InbodyChartPoint[]
  className?: string
}

type PlottedPoint = {
  x: number
  y: number
  value: number
  index: number
}

function getMetricValue(
  point: InbodyChartPoint,
  metric: InbodyChartMetric
): number | null {
  const value = point[metric.key]
  return value == null ? null : value
}

function buildSeriesPaths(
  values: Array<number | null>,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number
) {
  const defined = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value != null)

  if (defined.length === 0) return []

  const numericValues = defined.map((entry) => entry.value)
  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const totalPoints = values.length

  function xForIndex(index: number) {
    return totalPoints === 1
      ? width / 2
      : paddingX + (index / (totalPoints - 1)) * innerWidth
  }

  function yForValue(value: number) {
    return paddingY + innerHeight - ((value - min) / range) * innerHeight
  }

  const segments: string[] = []
  let currentSegment: string[] = []

  values.forEach((value, index) => {
    if (value == null) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '))
        currentSegment = []
      }
      return
    }

    const command = currentSegment.length === 0 ? 'M' : 'L'
    currentSegment.push(
      `${command} ${xForIndex(index).toFixed(2)} ${yForValue(value).toFixed(2)}`
    )
  })

  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(' '))
  }

  return segments
}

function buildSeriesPoints(
  values: Array<number | null>,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number
): PlottedPoint[] {
  const defined = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value != null)

  if (defined.length === 0) return []

  const numericValues = defined.map((entry) => entry.value)
  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2
  const totalPoints = values.length

  return defined.map(({ value, index }) => {
    const x =
      totalPoints === 1
        ? width / 2
        : paddingX + (index / (totalPoints - 1)) * innerWidth
    const y = paddingY + innerHeight - ((value - min) / range) * innerHeight
    return { x, y, value, index }
  })
}

function MetricChart({
  metric,
  points,
}: {
  metric: InbodyChartMetric
  points: InbodyChartPoint[]
}) {
  const width = 640
  const height = 88
  const paddingX = 24
  const paddingY = 28
  const values = points.map((point) => getMetricValue(point, metric))
  const paths = buildSeriesPaths(values, width, height, paddingX, paddingY)
  const plotted = buildSeriesPoints(values, width, height, paddingX, paddingY)

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">
          {metric.label}{' '}
          <span className="text-muted-foreground font-normal">({metric.unit})</span>
        </p>
      </div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[480px] w-full"
          role="img"
          aria-label={`${metric.label} history`}
        >
          {paths.map((path, index) => (
            <path
              key={`${metric.key}-segment-${index}`}
              d={path}
              fill="none"
              className={cn(metric.color, 'opacity-90')}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {plotted.map((point) => (
            <g key={`${metric.key}-${point.index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                className={cn(metric.color.replace('stroke-', 'fill-'))}
              />
              <text
                x={point.x}
                y={point.y - 10}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-medium"
              >
                {metric.formatValue(point.value)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

export function InbodyCompositionHistoryChart({
  points,
  className,
}: InbodyCompositionHistoryChartProps) {
  if (points.length === 0) {
    return (
      <p className={cn('text-muted-foreground text-sm', className)}>
        Log at least one scan to see body composition history.
      </p>
    )
  }

  const metrics = getVisibleInbodyChartMetrics(points)

  return (
    <div className={cn('space-y-6', className)}>
      {metrics.map((metric) => (
        <MetricChart key={metric.key} metric={metric} points={points} />
      ))}
      <div className="overflow-x-auto">
        <div
          className="text-muted-foreground flex min-w-[480px] justify-between gap-2 text-[11px]"
          style={{ paddingInline: '24px' }}
        >
          {points.map((point) => (
            <span key={point.scanDate} className="min-w-0 flex-1 text-center">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
