import Link from 'next/link'
import { ArrowRight, Target } from 'lucide-react'

import { ProgressBar } from '@/components/ui/progress-bar'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import type { PortalGoalHighlight } from '@/lib/portal-home-highlights'

function isGoalWrongDirection(status: PortalGoalHighlight['status']) {
  return status === 'off_track'
}

function goalHasNoProgress(goal: PortalGoalHighlight) {
  const showPercent =
    goal.status !== 'awaiting_scan' && goal.status !== 'awaiting_data'

  return (
    !showPercent ||
    goal.percent === 0 ||
    goal.status === 'awaiting_data' ||
    goal.status === 'awaiting_scan' ||
    goal.status === 'no_change'
  )
}

function noProgressHint(goal: PortalGoalHighlight) {
  if (goal.status === 'awaiting_scan') {
    return 'Log a scan to start tracking'
  }
  return 'Log a session to start tracking'
}

type PortalActiveGoalsCardProps = {
  goals: PortalGoalHighlight[]
  compact?: boolean
}

export function PortalActiveGoalsCard({
  goals,
  compact = false,
}: PortalActiveGoalsCardProps) {
  const visibleGoals = compact ? goals.slice(0, 2) : goals
  if (goals.length === 0) {
    return (
      <Card className={cn('h-full', compact && 'py-0')}>
        <CardHeader className={cn('pb-2', compact && 'px-4 pt-4')}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="text-brand size-4" />
            Active goals
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? 'px-4 pb-4' : undefined}>
          <EmptyState
            icon={Target}
            title="No active goals yet"
            description="Your coach will set performance, habit, and body composition goals for you here."
            action={{ label: 'View goals', href: '/portal/goals' }}
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Link href="/portal/goals" className="group block h-full">
      <Card
        className={cn(
          'h-full transition-colors group-hover:border-brand/40',
          compact && 'py-0'
        )}
      >
        <CardHeader className={cn('pb-2', compact && 'px-4 pt-4')}>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Target className="text-brand size-4" />
              Active goals
            </span>
            <span className="text-brand flex items-center gap-1 text-xs font-medium">
              View all
              <ArrowRight className="size-3.5" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={cn('space-y-3', compact && 'px-4 pb-4')}>
          <ul className="space-y-3">
            {visibleGoals.map((goal) => {
              const hasNoProgress = goalHasNoProgress(goal)
              const wrongDirection = isGoalWrongDirection(goal.status)

              return (
                <li key={goal.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="line-clamp-2 leading-snug">{goal.label}</span>
                    {hasNoProgress ? (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        —
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'shrink-0 tabular-nums font-medium',
                          wrongDirection ? 'text-destructive' : 'text-brand'
                        )}
                      >
                        {`${goal.percent}%`}
                      </span>
                    )}
                  </div>
                  {hasNoProgress ? (
                    <>
                      <ProgressBar value={0} barClassName="bg-muted-foreground/30" />
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {noProgressHint(goal)}
                      </p>
                    </>
                  ) : (
                    <ProgressBar
                      value={goal.percent}
                      barClassName={
                        wrongDirection ? 'bg-destructive' : undefined
                      }
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </Link>
  )
}
