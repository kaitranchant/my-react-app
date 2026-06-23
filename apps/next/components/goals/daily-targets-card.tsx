import { Target } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatDailyTargetLabel,
  getDailyTargetCheckInHint,
} from '@/lib/goal-progress'
import type { ClientCheckIn, ClientGoal } from 'app/types/database'

type DailyTargetsCardProps = {
  goals: ClientGoal[]
  checkIns?: ClientCheckIn[]
  description?: string
  compact?: boolean
}

export function DailyTargetsCard({
  goals,
  checkIns = [],
  description = 'Daily targets set by your coach.',
  compact = false,
}: DailyTargetsCardProps) {
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Daily targets from your coach
          </CardTitle>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              No daily targets yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {goals.map((goal) => (
                <span
                  key={goal.id}
                  className="border-border bg-muted/40 text-foreground inline-flex rounded-full border px-3 py-1.5 text-sm font-medium"
                >
                  {formatDailyTargetLabel(goal)}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily targets</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No daily targets yet"
            description="Your coach can set daily reminders like water intake, steps, or sleep here."
            className="py-4"
          />
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
