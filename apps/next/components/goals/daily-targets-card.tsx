import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDailyTargetLabel } from '@/lib/goal-progress'
import type { ClientGoal } from 'app/types/database'

type DailyTargetsCardProps = {
  goals: ClientGoal[]
  description?: string
}

export function DailyTargetsCard({
  goals,
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
          <ul className="flex flex-wrap gap-2">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="border-brand/20 bg-brand/5 text-foreground rounded-full border px-3 py-1.5 text-sm font-medium"
              >
                {formatDailyTargetLabel(goal)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
