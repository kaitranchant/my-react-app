import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import {
  computeCompositionProgress,
  formatCompositionGoalLabel,
} from '@/lib/goal-progress'
import type { ClientGoal, ClientInbodyScan } from 'app/types/database'

type GoalProgressCardProps = {
  goal: ClientGoal
  scans: ClientInbodyScan[]
}

export function GoalProgressCard({ goal, scans }: GoalProgressCardProps) {
  const progress = computeCompositionProgress(goal, scans)
  const label = formatCompositionGoalLabel(goal)

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription>{progress.detailLine}</CardDescription>
          </div>
          <span className="text-brand shrink-0 text-2xl font-semibold tabular-nums">
            {progress.status === 'awaiting_scan' ? '—' : `${progress.percent}%`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ProgressBar value={progress.percent} />
        {progress.hint ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {progress.hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
