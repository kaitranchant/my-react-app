import { ProgressBar } from '@/components/ui/progress-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ClientProgramSummary } from '@/lib/client-program-progress'

type PortalProgramCardProps = {
  name: string
  description: string | null
  summary: ClientProgramSummary | null
}

export function PortalProgramCard({
  name,
  description,
  summary,
}: PortalProgramCardProps) {
  const progressPercent = summary
    ? Math.round((summary.currentWeek / summary.totalWeeks) * 100)
    : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your program</CardTitle>
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

        {summary && progressPercent !== null ? (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-sm">
              Week {summary.currentWeek} of {summary.totalWeeks}
            </p>
            <ProgressBar value={progressPercent} className="h-1" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
