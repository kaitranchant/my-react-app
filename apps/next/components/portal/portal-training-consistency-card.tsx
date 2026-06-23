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
            Last 12 weeks
          </CardDescription>
          <CardDescription className="hidden text-xs lg:block">
            Last 12 weeks · {heatmap.totalSessions} sessions ·{' '}
            {heatmap.activeDays} active days
          </CardDescription>
        </div>
        <Link
          href="/portal/progress"
          className="text-brand hidden shrink-0 items-center gap-1 text-xs font-medium lg:flex"
        >
          Full year
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="lg:hidden">
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sessions: {heatmap.totalSessions} · Active days: {heatmap.activeDays}{' '}
            · Longest streak: {longestStreakLabel}
          </p>
          <Link
            href="/portal/progress"
            className="text-brand mt-2 inline-flex items-center gap-1 text-xs font-medium"
          >
            View full history
            <ArrowRight className="size-3.5" />
          </Link>
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
