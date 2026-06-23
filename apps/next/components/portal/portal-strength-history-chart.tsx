'use client'

import * as React from 'react'
import { Loader2, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

import { getPortalStrengthHistoryTrend } from '@/app/portal/strength-history-actions'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatStrengthE1rm } from '@/lib/strength-history'
import type {
  StrengthHistoryExercise,
  StrengthHistoryPoint,
  StrengthHistoryTrend,
} from '@/lib/strength-history'
import { cn } from '@/lib/utils'
import type { WeightUnit } from 'app/types/database'

type PortalStrengthHistoryChartProps = {
  exercises: StrengthHistoryExercise[]
  initialExerciseId: string | null
  initialTrend: StrengthHistoryTrend | null
  weightUnit?: WeightUnit
  className?: string
  presentation?: 'default' | 'portal'
}

const CHART_WIDTH = 640
const CHART_HEIGHT = 180
const CHART_PADDING_X = 28
const CHART_PADDING_Y = 24
const CHART_AXIS_HEIGHT = 20

function buildLinePath(
  values: Array<number | null>,
  width: number,
  height: number,
  paddingX: number,
  paddingY: number
): string | null {
  const defined = values
    .map((value, index) => ({ value, index }))
    .filter((entry): entry is { value: number; index: number } => entry.value != null)

  if (defined.length === 0) return null

  const numericValues = defined.map((entry) => entry.value)
  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingY * 2 - CHART_AXIS_HEIGHT
  const totalPoints = values.length

  return defined
    .map(({ value, index }, segmentIndex) => {
      const x =
        totalPoints === 1
          ? width / 2
          : paddingX + (index / (totalPoints - 1)) * innerWidth
      const y = paddingY + innerHeight - ((value - min) / range) * innerHeight
      return `${segmentIndex === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function buildPlottedPoints(
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
  const innerHeight = height - paddingY * 2 - CHART_AXIS_HEIGHT
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

function StrengthTrendChart({
  points,
  weightUnit,
  compact = false,
}: {
  points: StrengthHistoryPoint[]
  weightUnit: WeightUnit
  compact?: boolean
}) {
  const height = (compact ? 140 : CHART_HEIGHT) + CHART_AXIS_HEIGHT
  const values = points.map((point) => point.e1rm)
  const path = buildLinePath(
    values,
    CHART_WIDTH,
    height,
    CHART_PADDING_X,
    CHART_PADDING_Y
  )
  const plotted = buildPlottedPoints(
    values,
    CHART_WIDTH,
    height,
    CHART_PADDING_X,
    CHART_PADDING_Y
  )
  const hasData = values.some((value) => value != null)

  if (!hasData) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No PR history for this exercise yet.
      </p>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${height}`}
      className="w-full"
      role="img"
      aria-label="Strength history chart"
    >
      {path ? (
        <path
          d={path}
          fill="none"
          className="stroke-brand opacity-90"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {plotted.map((point) => (
        <g key={point.index}>
          <circle
            cx={point.x}
            cy={point.y}
            r="4.5"
            className="fill-brand"
          />
          <text
            x={point.x}
            y={point.y - 12}
            textAnchor="middle"
            className="fill-foreground text-[11px] font-medium"
          >
            {formatStrengthE1rm(point.value, weightUnit).replace(' e1RM', '')}
          </text>
        </g>
      ))}
      {points.map((point, index) => {
        const x =
          points.length === 1
            ? CHART_WIDTH / 2
            : CHART_PADDING_X +
              (index / (points.length - 1)) *
                (CHART_WIDTH - CHART_PADDING_X * 2)
        return (
          <text
            key={point.monthKey}
            x={x}
            y={height - 4}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {point.label}
          </text>
        )
      })}
    </svg>
  )
}

export function PortalStrengthHistoryChart({
  exercises,
  initialExerciseId,
  initialTrend,
  weightUnit = 'lbs',
  className,
  presentation = 'default',
}: PortalStrengthHistoryChartProps) {
  const isPortal = presentation === 'portal'
  const [selectedExerciseId, setSelectedExerciseId] = React.useState(
    initialExerciseId ?? exercises[0]?.id ?? ''
  )
  const [trend, setTrend] = React.useState<StrengthHistoryTrend | null>(
    initialTrend
  )
  const [loading, setLoading] = React.useState(false)

  const selectedExercise = exercises.find(
    (exercise) => exercise.id === selectedExerciseId
  )
  const latestPrDateLabel = selectedExercise?.latestAchievedAt
    ? new Date(selectedExercise.latestAchievedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  async function handleExerciseChange(exerciseId: string) {
    setSelectedExerciseId(exerciseId)
    setLoading(true)

    const result = await getPortalStrengthHistoryTrend(exerciseId)
    setLoading(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setTrend(result.trend)
  }

  if (exercises.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No strength history yet"
        description="Beat your previous best on a logged set and your e1RM trends will appear here."
        action={{ label: 'Log a workout', href: '/portal/workouts' }}
        className={cn('py-8', className)}
      />
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'flex flex-col gap-3',
          !isPortal && 'sm:flex-row sm:items-end sm:justify-between'
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          {!isPortal ? <p className="text-sm font-medium">Exercise</p> : null}
          <Select
            value={selectedExerciseId}
            onValueChange={(value) => void handleExerciseChange(value)}
            disabled={loading}
          >
            <SelectTrigger className={cn('w-full', !isPortal && 'sm:max-w-xs')}>
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                  {exercise.currentE1rm != null
                    ? ` · ${formatStrengthE1rm(exercise.currentE1rm, weightUnit)}`
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {trend?.currentE1rm != null ? (
          <div className={cn(isPortal ? 'space-y-1' : 'text-right')}>
            <p className="text-muted-foreground text-xs">Current best</p>
            <div
              className={cn(
                'flex gap-2',
                isPortal ? 'items-center justify-between' : 'flex-col items-end'
              )}
            >
              <p
                className={cn(
                  'font-semibold tabular-nums',
                  isPortal ? 'text-xl text-brand' : 'text-lg'
                )}
              >
                {formatStrengthE1rm(trend.currentE1rm, weightUnit)}
              </p>
              {isPortal && latestPrDateLabel ? (
                <p className="text-muted-foreground shrink-0 text-xs">
                  <span aria-hidden>🔥</span> New PR · {latestPrDateLabel}
                </p>
              ) : !isPortal && trend.changeLabel ? (
                <p className="text-muted-foreground text-xs">{trend.changeLabel}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative">
        {loading ? (
          <div className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center rounded-lg">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : null}
        {trend ? (
          <StrengthTrendChart
            points={trend.points}
            weightUnit={weightUnit}
            compact={isPortal}
          />
        ) : (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Select an exercise to view your strength trend.
          </p>
        )}
      </div>

      {selectedExercise && !isPortal ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Running best estimated 1RM for {selectedExercise.name} over the last 6
          months. Each point shows your peak e1RM through the end of that month.
        </p>
      ) : null}
    </div>
  )
}
