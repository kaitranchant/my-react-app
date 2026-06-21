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
              <CardTitle className="text-base">{title}</CardTitle>
              <GoalStatusBadge status={progress.status} />
            </div>
            <CardDescription>{progress.detailLine}</CardDescription>
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
        {progress.hint ? (
          <p
            className={cn(
              'text-xs leading-relaxed',
              isNegative ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
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
