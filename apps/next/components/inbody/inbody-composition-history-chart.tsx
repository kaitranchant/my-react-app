'use client'

import * as React from 'react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  DEFAULT_COMBINED_INBODY_METRIC_KEYS,
  formatInbodyChartAxisLabel,
  getVisibleInbodyChartMetrics,
  MAX_COMBINED_INBODY_METRICS,
  type InbodyChartMetric,
  type InbodyChartMetricKey,
  type InbodyChartPoint,
} from '@/lib/inbody-scans'

type InbodyCompositionHistoryChartProps = {
  points: InbodyChartPoint[]
  className?: string
}

type ChartView = 'individual' | 'combined'

type PlottedPoint = {
  x: number
  y: number
  value: number
  index: number
}

const CHART_WIDTH = 640
const CHART_PADDING_X = 24
const CHART_PADDING_Y = 28
const CHART_AXIS_HEIGHT = 18
const INDIVIDUAL_CHART_HEIGHT = 88
const COMBINED_CHART_HEIGHT = 160

function getMetricValue(
  point: InbodyChartPoint,
  metric: InbodyChartMetric
): number | null {
  const value = point[metric.key]
  return value == null ? null : value
}

function xForIndex(
  index: number,
  totalPoints: number,
  width: number,
  paddingX: number
) {
  const innerWidth = width - paddingX * 2
  return totalPoints === 1
    ? width / 2
    : paddingX + (index / (totalPoints - 1)) * innerWidth
}

function yForValue(
  value: number,
  min: number,
  max: number,
  height: number,
  paddingY: number
) {
  const range = max - min || 1
  const innerHeight = height - paddingY * 2 - CHART_AXIS_HEIGHT
  return paddingY + innerHeight - ((value - min) / range) * innerHeight
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
  const totalPoints = values.length
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
      `${command} ${xForIndex(index, totalPoints, width, paddingX).toFixed(2)} ${yForValue(value, min, max, height, paddingY).toFixed(2)}`
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
  const totalPoints = values.length

  return defined.map(({ value, index }) => ({
    x: xForIndex(index, totalPoints, width, paddingX),
    y: yForValue(value, min, max, height, paddingY),
    value,
    index,
  }))
}

function ChartXAxisLabels({
  points,
  width,
  height,
  paddingX,
}: {
  points: InbodyChartPoint[]
  width: number
  height: number
  paddingX: number
}) {
  const totalPoints = points.length

  return (
    <>
      {points.map((point, index) => (
        <text
          key={point.scanDate}
          x={xForIndex(index, totalPoints, width, paddingX)}
          y={height - 4}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          {formatInbodyChartAxisLabel(point.scanDate)}
        </text>
      ))}
    </>
  )
}

function MetricChart({
  metric,
  points,
}: {
  metric: InbodyChartMetric
  points: InbodyChartPoint[]
}) {
  const height = INDIVIDUAL_CHART_HEIGHT + CHART_AXIS_HEIGHT
  const values = points.map((point) => getMetricValue(point, metric))
  const paths = buildSeriesPaths(
    values,
    CHART_WIDTH,
    height,
    CHART_PADDING_X,
    CHART_PADDING_Y
  )
  const plotted = buildSeriesPoints(
    values,
    CHART_WIDTH,
    height,
    CHART_PADDING_X,
    CHART_PADDING_Y
  )

  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">
          {metric.label}{' '}
          <span className="text-muted-foreground font-normal">({metric.unit})</span>
        </p>
      </div>
      <svg
          viewBox={`0 0 ${CHART_WIDTH} ${height}`}
          className="w-full"
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
          <ChartXAxisLabels
            points={points}
            width={CHART_WIDTH}
            height={height}
            paddingX={CHART_PADDING_X}
          />
        </svg>
    </div>
  )
}

function CombinedMetricChart({
  metrics,
  points,
}: {
  metrics: InbodyChartMetric[]
  points: InbodyChartPoint[]
}) {
  const height = COMBINED_CHART_HEIGHT + CHART_AXIS_HEIGHT

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                'size-2.5 rounded-full',
                metric.color.replace('stroke-', 'bg-')
              )}
              aria-hidden
            />
            <span>
              {metric.label}{' '}
              <span className="text-muted-foreground">({metric.unit})</span>
            </span>
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${height}`}
        className="w-full"
        role="img"
        aria-label="Combined body composition history"
      >
          {metrics.map((metric, seriesIndex) => {
            const values = points.map((point) => getMetricValue(point, metric))
            const paths = buildSeriesPaths(
              values,
              CHART_WIDTH,
              height,
              CHART_PADDING_X,
              CHART_PADDING_Y
            )
            const plotted = buildSeriesPoints(
              values,
              CHART_WIDTH,
              height,
              CHART_PADDING_X,
              CHART_PADDING_Y
            )
            const labelOffset = 10 + seriesIndex * 12

            return (
              <g key={metric.key}>
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
                      y={point.y - labelOffset}
                      textAnchor="middle"
                      className={cn(metric.color.replace('stroke-', 'fill-'), 'text-[10px] font-medium')}
                    >
                      {metric.formatValue(point.value)}
                    </text>
                  </g>
                ))}
              </g>
            )
          })}
          <ChartXAxisLabels
            points={points}
            width={CHART_WIDTH}
            height={height}
            paddingX={CHART_PADDING_X}
          />
        </svg>
      <p className="text-muted-foreground text-xs">
        Each metric is scaled independently so trends with different units can be
        compared on one timeline.
      </p>
    </div>
  )
}

function MetricSelector({
  metrics,
  selectedKeys,
  onChange,
}: {
  metrics: InbodyChartMetric[]
  selectedKeys: InbodyChartMetricKey[]
  onChange: (keys: InbodyChartMetricKey[]) => void
}) {
  function toggleMetric(key: InbodyChartMetricKey) {
    if (selectedKeys.includes(key)) {
      if (selectedKeys.length === 1) return
      onChange(selectedKeys.filter((selectedKey) => selectedKey !== key))
      return
    }

    if (selectedKeys.length >= MAX_COMBINED_INBODY_METRICS) return
    onChange([...selectedKeys, key])
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">
        Select up to {MAX_COMBINED_INBODY_METRICS} metrics to overlay.
      </p>
      <div className="flex flex-wrap gap-2">
        {metrics.map((metric) => {
          const selected = selectedKeys.includes(metric.key)
          const disabled =
            !selected && selectedKeys.length >= MAX_COMBINED_INBODY_METRICS

          return (
            <button
              key={metric.key}
              type="button"
              disabled={disabled}
              onClick={() => toggleMetric(metric.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                selected
                  ? 'border-foreground/20 bg-muted text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  metric.color.replace('stroke-', 'bg-')
                )}
                aria-hidden
              />
              {metric.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function InbodyCompositionHistoryChart({
  points,
  className,
}: InbodyCompositionHistoryChartProps) {
  const metrics = React.useMemo(
    () => getVisibleInbodyChartMetrics(points),
    [points]
  )
  const [view, setView] = React.useState<ChartView>('individual')
  const [selectedKeys, setSelectedKeys] = React.useState<InbodyChartMetricKey[]>(
    DEFAULT_COMBINED_INBODY_METRIC_KEYS
  )

  const visibleSelectedKeys = React.useMemo(
    () =>
      selectedKeys.filter((key) => metrics.some((metric) => metric.key === key)),
    [metrics, selectedKeys]
  )

  React.useEffect(() => {
    if (visibleSelectedKeys.length > 0) return
    const fallback = DEFAULT_COMBINED_INBODY_METRIC_KEYS.filter((key) =>
      metrics.some((metric) => metric.key === key)
    )
    setSelectedKeys(
      fallback.length > 0 ? fallback.slice(0, MAX_COMBINED_INBODY_METRICS) : [metrics[0].key]
    )
  }, [metrics, visibleSelectedKeys.length])

  const combinedMetrics = metrics.filter((metric) =>
    visibleSelectedKeys.includes(metric.key)
  )

  if (points.length === 0) {
    return (
      <p className={cn('text-muted-foreground text-sm', className)}>
        Log at least one scan to see body composition history.
      </p>
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      <Tabs value={view} onValueChange={(value) => setView(value as ChartView)}>
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="combined">Combined</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'individual' ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {metrics.map((metric) => (
            <MetricChart key={metric.key} metric={metric} points={points} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <MetricSelector
            metrics={metrics}
            selectedKeys={visibleSelectedKeys}
            onChange={setSelectedKeys}
          />
          <CombinedMetricChart metrics={combinedMetrics} points={points} />
        </div>
      )}
    </div>
  )
}
