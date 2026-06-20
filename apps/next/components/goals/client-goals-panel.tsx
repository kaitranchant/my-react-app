'use client'

import { ClientGoalsEditor } from '@/components/goals/client-goals-editor'
import { DailyTargetsCard } from '@/components/goals/daily-targets-card'
import { GoalProgressCard } from '@/components/goals/goal-progress-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { partitionClientGoals } from '@/lib/goal-progress'
import type { Client, ClientGoal, ClientInbodyScan } from 'app/types/database'

type ClientGoalsPanelProps = {
  client: Pick<Client, 'id' | 'full_name'>
  goals: ClientGoal[]
  scans: ClientInbodyScan[]
  schemaError?: string | null
}

export function ClientGoalsPanel({
  client,
  goals,
  scans,
  schemaError = null,
}: ClientGoalsPanelProps) {
  const { dailyGoals, compositionGoals } = partitionClientGoals(goals)

  return (
    <div className="grid gap-6">
      <ClientGoalsEditor
        clientId={client.id}
        goals={goals}
        schemaError={schemaError}
      />

      {!schemaError?.includes('Could not find the table') ? (
        <section className="grid gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Client preview</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This is how {client.full_name.split(' ')[0]} will see their goals in
              the portal.
            </p>
          </div>

          <DailyTargetsCard
            goals={dailyGoals}
            description="Daily reminders from you."
          />

          {compositionGoals.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Body composition goals</CardTitle>
                <CardDescription>
                  Add a composition goal above to preview progress tracking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  No composition goals yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {compositionGoals.map((goal) => (
                <GoalProgressCard key={goal.id} goal={goal} scans={scans} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}
