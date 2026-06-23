import { Zap } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { GoalStatusBadge } from '@/components/goals/goal-status-badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { cn } from '@/lib/utils'
import {
  formatCompactGoalDetailLine,
  formatGoalTargetDateLabel,
  getGoalProgressBarClassName,
  isNegativeGoalStatus,
  type GoalProgressBase,
} from '@/lib/goal-progress'

type TrackableGoalCardProps = {
  title: string
  progress: GoalProgressBase
  targetDate?: string | null
  percentHidden?: boolean
  presentation?: 'default' | 'portal'
}

export function TrackableGoalCard({
  title,
  progress,
  targetDate = null,
  percentHidden = false,
  presentation = 'default',
}: TrackableGoalCardProps) {
  const isPortal = presentation === 'portal'
  const isNegative = isNegativeGoalStatus(progress.status)
  const showPercent =
    !percentHidden &&
    progress.status !== 'awaiting_scan' &&
    progress.status !== 'awaiting_data'
  const targetDateLabel = formatGoalTargetDateLabel(targetDate)
  const compactDetailLine = formatCompactGoalDetailLine(
    progress.detailLine,
    targetDate
  )
  const progressBarClassName = getGoalProgressBarClassName(progress.status)

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{title}</CardTitle>
              <GoalStatusBadge status={progress.status} />
            </div>
            <div className="space-y-1">
              {isPortal ? (
                <>
                  <CardDescription className="md:hidden">
                    {compactDetailLine}
                  </CardDescription>
                  <CardDescription className="hidden md:block">
                    {progress.detailLine}
                  </CardDescription>
                </>
              ) : (
                <CardDescription>{progress.detailLine}</CardDescription>
              )}
              {isNegative && progress.hint ? (
                <p
                  className={cn(
                    'flex items-start gap-1.5 text-sm leading-relaxed',
                    isPortal ? 'text-status-warning' : 'text-destructive'
                  )}
                >
                  {isPortal ? (
                    <Zap className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  <span>{progress.hint}</span>
                </p>
              ) : null}
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 text-2xl font-semibold tabular-nums',
              isPortal || !isNegative ? 'text-brand' : 'text-destructive'
            )}
          >
            {showPercent ? `${progress.percent}%` : '—'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ProgressBar
          value={progress.percent}
          barClassName={
            isPortal
              ? progressBarClassName
              : isNegative
                ? 'bg-destructive'
                : undefined
          }
        />
        {progress.hint && !isNegative ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {progress.hint}
          </p>
        ) : null}
        {targetDateLabel && !(isPortal && compactDetailLine.includes('Due ')) ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Target date: {targetDateLabel}
          </p>
        ) : null}
        {progress.estimatedCompletionLabel ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {progress.estimatedCompletionLabel}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
