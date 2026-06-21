import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatDailyTargetLabel,
  getDailyTargetCheckInHint,
} from '@/lib/goal-progress'
import type { ClientCheckIn, ClientGoal } from 'app/types/database'

type DailyTargetsCardProps = {
  goals: ClientGoal[]
  checkIns?: ClientCheckIn[]
  description?: string
}

export function DailyTargetsCard({
  goals,
  checkIns = [],
  description = 'Daily targets set by your coach.',
}: DailyTargetsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily targets</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            No daily targets yet.
          </p>
        ) : (
          <ul className="grid gap-3">
            {goals.map((goal) => {
              const hint = getDailyTargetCheckInHint(goal, checkIns)

              return (
                <li key={goal.id} className="space-y-1">
                  <span className="border-brand/20 bg-brand/5 text-foreground inline-flex rounded-full border px-3 py-1.5 text-sm font-medium">
                    {formatDailyTargetLabel(goal)}
                  </span>
                  {hint ? (
                    <p className="text-muted-foreground pl-1 text-xs leading-relaxed">
                      {hint}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
