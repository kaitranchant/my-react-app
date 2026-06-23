import {
  COMPACT_HEATMAP_WEEKS,
  formatTrainingConsistencyDayLabel,
  sliceHeatmapWeeks,
} from '@/lib/training-consistency'
import type {
  TrainingConsistencyDay,
  TrainingConsistencyHeatmap,
  TrainingConsistencyLevel,
} from '@/lib/training-consistency'
import { cn } from '@/lib/utils'
import type { WeekStartsOn } from 'app/types/database'

type TrainingConsistencyHeatmapProps = {
  heatmap: TrainingConsistencyHeatmap
  weekStartsOn?: WeekStartsOn
  compact?: boolean
  displayWeeks?: number
  className?: string
}

const LEVEL_CLASS: Record<TrainingConsistencyLevel, string> = {
  0: 'bg-muted/70',
  1: 'bg-brand/25',
  2: 'bg-brand/45',
  3: 'bg-brand/70',
  4: 'bg-brand',
}

const WEEKDAY_LABELS: Record<WeekStartsOn, string[]> = {
  monday: ['Mon', '', 'Wed', '', 'Fri', '', ''],
  sunday: ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'],
}

function getDayClassName(day: TrainingConsistencyDay): string {
  if (day.count > 0) return LEVEL_CLASS[day.level]
  if (day.missed) return 'border border-destructive/45 bg-destructive/10'
  return LEVEL_CLASS[0]
}

export function TrainingConsistencyHeatmap({
  heatmap,
  weekStartsOn = 'monday',
  compact = false,
  displayWeeks,
  className,
}: TrainingConsistencyHeatmapProps) {
  const weekdayLabels = WEEKDAY_LABELS[weekStartsOn]
  const hasActivity = heatmap.totalSessions > 0
  const recentWeekCount = displayWeeks ?? (compact ? COMPACT_HEATMAP_WEEKS : undefined)
  const { weeks, monthLabels } = recentWeekCount
    ? sliceHeatmapWeeks(heatmap, recentWeekCount)
    : { weeks: heatmap.weeks, monthLabels: heatmap.monthLabels }
  const cellSize = compact ? 'size-2.5' : 'size-3'
  const columnWidth = compact ? 'w-2.5' : 'w-3'
  const labelWidth = compact ? 'w-6' : 'w-7'
  const labelPadding = compact ? 'pl-6' : 'pl-8'

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'flex flex-wrap gap-x-6 gap-y-2',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        <div>
          <p className="text-muted-foreground text-xs">Sessions</p>
          <p className="font-semibold tabular-nums">{heatmap.totalSessions}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Active days</p>
          <p className="font-semibold tabular-nums">{heatmap.activeDays}</p>
        </div>
        {!compact && heatmap.missedDays > 0 ? (
          <div>
            <p className="text-muted-foreground text-xs">Missed days</p>
            <p className="font-semibold tabular-nums">{heatmap.missedDays}</p>
          </div>
        ) : null}
        <div>
          <p className="text-muted-foreground text-xs">Longest streak</p>
          <p className="font-semibold tabular-nums">
            {heatmap.longestStreak > 0
              ? `${heatmap.longestStreak} day${heatmap.longestStreak === 1 ? '' : 's'}`
              : '—'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1">
          {!compact ? (
            <div className={cn('flex gap-1', labelPadding)}>
              {weeks.map((_, weekIndex) => {
                const monthLabel = monthLabels.find(
                  (label) => label.weekIndex === weekIndex
                )

                return (
                  <div
                    key={`month-${weekIndex}`}
                    className={cn(
                      'text-muted-foreground shrink-0 text-[10px] leading-none',
                      columnWidth
                    )}
                  >
                    {monthLabel?.label ?? ''}
                  </div>
                )
              })}
            </div>
          ) : null}

          <div className="flex gap-1">
            {!compact ? (
              <div className={cn('flex shrink-0 flex-col gap-1', labelWidth)}>
                {weekdayLabels.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className={cn(
                      'text-muted-foreground flex items-center text-[10px] leading-none',
                      cellSize
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
            ) : null}

            {weeks.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={cn(
                      'rounded-[3px]',
                      cellSize,
                      day ? getDayClassName(day) : 'bg-transparent'
                    )}
                    title={day ? formatTrainingConsistencyDayLabel(day) : undefined}
                    aria-label={
                      day ? formatTrainingConsistencyDayLabel(day) : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3',
          compact && 'gap-2'
        )}
      >
        <p className="text-muted-foreground text-xs leading-relaxed">
          {hasActivity
            ? compact
              ? 'Recent training activity. Darker squares mean more completed sessions.'
              : 'Each square is a day. Darker squares mean more completed sessions. Outlined squares are missed sessions.'
            : 'Complete workouts to start building training history.'}
        </p>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as TrainingConsistencyLevel[]).map((level) => (
            <span
              key={level}
              className={cn('rounded-[3px]', cellSize, LEVEL_CLASS[level])}
            />
          ))}
          <span>More</span>
          {!compact ? (
            <span
              className={cn(
                'ml-1 rounded-[3px] border border-destructive/45 bg-destructive/10',
                cellSize
              )}
              title="Missed session"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
