'use client'

import { ClientGoalsEditor } from '@/components/goals/client-goals-editor'
import { DailyTargetsCard } from '@/components/goals/daily-targets-card'
import { GoalProgressCard } from '@/components/goals/goal-progress-card'
import { HabitGoalCard } from '@/components/goals/habit-goal-card'
import { MilestoneGoalCard } from '@/components/goals/milestone-goal-card'
import { PerformanceGoalCard } from '@/components/goals/performance-goal-card'
import { partitionClientGoals } from '@/lib/goal-progress'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { Client, ClientGoal, Exercise, Program } from 'app/types/database'

type ClientGoalsPanelProps = {
  client: Pick<Client, 'id' | 'full_name'>
  goals: ClientGoal[]
  progressContext: GoalProgressContext
  exercises: Pick<Exercise, 'id' | 'name'>[]
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
  coachPreferences?: Pick<CoachPreferences, 'weekStartsOn' | 'timezone'>
  schemaError?: string | null
}

export function ClientGoalsPanel({
  client,
  goals,
  progressContext,
  exercises,
  programs,
  coachPreferences,
  schemaError = null,
}: ClientGoalsPanelProps) {
  const {
    dailyGoals,
    compositionGoals,
    performanceGoals,
    habitGoals,
    milestoneGoals,
  } = partitionClientGoals(goals)

  return (
    <div className="grid gap-6">
      <ClientGoalsEditor
        clientId={client.id}
        goals={goals}
        exercises={exercises}
        programs={programs}
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
            checkIns={progressContext.checkIns}
            description="Daily reminders from you."
          />

          {performanceGoals.length > 0 ? (
            <section className="grid gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">
                  Performance goals
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Progress updates automatically from workout PRs.
                </p>
              </div>
              {performanceGoals.map((goal) => (
                <PerformanceGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                />
              ))}
            </section>
          ) : null}

          {habitGoals.length > 0 ? (
            <section className="grid gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">
                  Habit goals
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Weekly consistency tracked from workouts and check-ins.
                </p>
              </div>
              {habitGoals.map((goal) => (
                <HabitGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                  coachPreferences={coachPreferences}
                />
              ))}
            </section>
          ) : null}

          {milestoneGoals.length > 0 ? (
            <section className="grid gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">
                  Milestone goals
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Long-term milestones like session counts and training streaks.
                </p>
              </div>
              {milestoneGoals.map((goal) => (
                <MilestoneGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                />
              ))}
            </section>
          ) : null}

          {compositionGoals.length > 0 ? (
            <section className="grid gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">
                  Body composition goals
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Progress is measured from InBody scans or check-in weight when
                  configured.
                </p>
              </div>
              {compositionGoals.map((goal) => (
                <GoalProgressCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                  coachPreferences={coachPreferences}
                />
              ))}
            </section>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
