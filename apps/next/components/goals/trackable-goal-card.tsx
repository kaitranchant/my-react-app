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
  formatGoalTargetDateLabel,
  isNegativeGoalStatus,
  type GoalProgressBase,
} from '@/lib/goal-progress'

type TrackableGoalCardProps = {
  title: string
  progress: GoalProgressBase
  targetDate?: string | null
  percentHidden?: boolean
}

export function TrackableGoalCard({
  title,
  progress,
  targetDate = null,
  percentHidden = false,
}: TrackableGoalCardProps) {
  const isNegative = isNegativeGoalStatus(progress.status)
  const showPercent =
    !percentHidden &&
    progress.status !== 'awaiting_scan' &&
    progress.status !== 'awaiting_data'
  const targetDateLabel = formatGoalTargetDateLabel(targetDate)

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
              <CardDescription>{progress.detailLine}</CardDescription>
              {isNegative && progress.hint ? (
                <p className="text-destructive text-sm leading-relaxed">
                  {progress.hint}
                </p>
              ) : null}
            </div>
          </div>
          <span
            className={cn(
              'shrink-0 text-2xl font-semibold tabular-nums',
              isNegative ? 'text-destructive' : 'text-brand'
            )}
          >
            {showPercent ? `${progress.percent}%` : '—'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ProgressBar
          value={progress.percent}
          barClassName={isNegative ? 'bg-destructive' : undefined}
        />
        {progress.hint && !isNegative ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {progress.hint}
          </p>
        ) : null}
        {targetDateLabel ? (
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
