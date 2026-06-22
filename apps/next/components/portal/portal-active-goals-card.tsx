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

type PortalActiveGoalsCardProps = {
  goals: PortalGoalHighlight[]
}

export function PortalActiveGoalsCard({ goals }: PortalActiveGoalsCardProps) {
  if (goals.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Target className="text-brand size-5" />
            Active goals
          </CardTitle>
        </CardHeader>
        <CardContent>
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
    <Link href="/portal/goals" className="group block">
      <Card className="h-full transition-colors group-hover:border-brand/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Target className="text-brand size-5" />
              Active goals
            </span>
            <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {goals.map((goal) => {
              const showPercent =
                goal.status !== 'awaiting_scan' &&
                goal.status !== 'awaiting_data'

              return (
                <li key={goal.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="line-clamp-2 leading-snug">{goal.label}</span>
                    <span
                      className={cn(
                        'shrink-0 tabular-nums font-medium',
                        goal.isNegative ? 'text-destructive' : 'text-brand'
                      )}
                    >
                      {showPercent ? `${goal.percent}%` : '—'}
                    </span>
                  </div>
                  <ProgressBar
                    value={goal.percent}
                    barClassName={goal.isNegative ? 'bg-destructive' : undefined}
                  />
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </Link>
  )
}
