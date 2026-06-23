import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { PortalTrainingConsistencyHeatmap } from '@/components/portal/portal-training-consistency-heatmap'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { TrainingConsistencyHeatmap } from '@/lib/training-consistency'
import type { WeekStartsOn } from 'app/types/database'

type PortalTrainingConsistencyCardProps = {
  heatmap: TrainingConsistencyHeatmap
  weekStartsOn?: WeekStartsOn
}

export function PortalTrainingConsistencyCard({
  heatmap,
  weekStartsOn = 'monday',
}: PortalTrainingConsistencyCardProps) {
  const longestStreakLabel =
    heatmap.longestStreak > 0
      ? `${heatmap.longestStreak} day${heatmap.longestStreak === 1 ? '' : 's'}`
      : '—'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">Training consistency</CardTitle>
          <CardDescription className="text-xs lg:hidden">
            Last 12 weeks · {heatmap.totalSessions} sessions ·{' '}
            {heatmap.activeDays} active days
          </CardDescription>
          <CardDescription className="hidden text-xs lg:block">
            Last 12 weeks · {heatmap.totalSessions} sessions ·{' '}
            {heatmap.activeDays} active days
          </CardDescription>
        </div>
        <Link
          href="/portal/progress"
          className="text-brand inline-flex shrink-0 items-center gap-1 text-xs font-medium"
        >
          <span className="hidden lg:inline">Full year</span>
          <span className="lg:hidden">View all</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="lg:hidden">
          <PortalTrainingConsistencyHeatmap
            heatmap={heatmap}
            weekStartsOn={weekStartsOn}
            compact
            achievementColors
            hideMissedLegend
          />
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Longest streak: {longestStreakLabel}
          </p>
        </div>
        <div className="hidden lg:block">
          <PortalTrainingConsistencyHeatmap
            heatmap={heatmap}
            weekStartsOn={weekStartsOn}
            compact
            achievementColors
          />
        </div>
      </CardContent>
    </Card>
  )
}
