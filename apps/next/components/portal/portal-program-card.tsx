import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { ProgressBar } from '@/components/ui/progress-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatClientProgramSummaryLine,
  type ClientProgramSummary,
} from '@/lib/client-program-progress'

type PortalProgramCardProps = {
  name: string
  description: string | null
  summary: ClientProgramSummary | null
}

function getProgressPercent(summary: ClientProgramSummary): number {
  if (summary.scheduledThisWeek > 0) {
    return Math.round(
      (summary.completedThisWeek / summary.scheduledThisWeek) * 100
    )
  }
  return Math.round((summary.currentWeek / summary.totalWeeks) * 100)
}

export function PortalProgramCard({
  name,
  description,
  summary,
}: PortalProgramCardProps) {
  const progressPercent = summary ? getProgressPercent(summary) : null
  const summaryLine = summary ? formatClientProgramSummaryLine(summary) : null

  return (
    <Link href="/portal/workouts" className="group block">
      <Card className="transition-colors group-hover:border-brand/40">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Your program</CardTitle>
          <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <p className="font-medium">{name}</p>
            {description?.trim() ? (
              <p className="text-muted-foreground text-sm leading-snug">
                {description.trim()}
              </p>
            ) : null}
          </div>

          {summary && progressPercent !== null && summaryLine ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-sm">{summaryLine}</p>
              <ProgressBar value={progressPercent} className="h-1" />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}
