import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { DailyTargetsCard } from '@/components/goals/daily-targets-card'
import { GoalProgressCard } from '@/components/goals/goal-progress-card'
import { HabitGoalCard } from '@/components/goals/habit-goal-card'
import { MilestoneGoalCard } from '@/components/goals/milestone-goal-card'
import { PerformanceGoalCard } from '@/components/goals/performance-goal-card'
import { partitionClientGoals } from '@/lib/goal-progress'
import { fetchGoalProgressContext } from '@/lib/goal-progress-context'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import { Dumbbell, Flag, Repeat, Scale } from 'lucide-react'
import type { ClientGoal } from 'app/types/database'

export const metadata = {
  title: 'Goals — Coaching App',
}

export default async function PortalGoalsPage() {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let goals: ClientGoal[] = []
  let goalsSchemaError: string | null = null
  let progressContext: GoalProgressContext = {
    scans: [],
    checkIns: [],
    prRecords: [],
    bestDurationByExerciseId: {},
    workouts: [],
    activeAssignment: null,
    programDayOffsets: [],
    exercises: [],
  }

  if (clientRecord?.id) {
    const [goalsResult, context] = await Promise.all([
      supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('sort_order', { ascending: true }),
      fetchGoalProgressContext(supabase, clientRecord.id),
    ])

    goals = (goalsResult.data ?? []) as ClientGoal[]
    goalsSchemaError = goalsResult.error?.message ?? null
    progressContext = context
  }

  const {
    dailyGoals,
    compositionGoals,
    performanceGoals,
    habitGoals,
    milestoneGoals,
  } = partitionClientGoals(goals)

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Goals</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Daily targets, performance, habits, milestones, and body composition
          progress set by your coach.
        </p>
      </section>

      {!clientRecord ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can see your goals.
          </CardContent>
        </Card>
      ) : goalsSchemaError?.includes('Could not find the table') ? (
        <SchemaSetupNotice
          tables={['client_goals']}
          sqlFile="apply-client-goals-v2.sql"
        />
      ) : (
        <>
          <DailyTargetsCard goals={dailyGoals} checkIns={progressContext.checkIns} />

          <section className="grid gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Performance goals
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Progress updates automatically from your workout PRs.
              </p>
            </div>
            {performanceGoals.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Dumbbell}
                    title="No performance goals yet"
                    description="Your coach can set lift targets and PR goals that update as you log workouts."
                    className="py-4"
                  />
                </CardContent>
              </Card>
            ) : (
              performanceGoals.map((goal) => (
                <PerformanceGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                />
              ))
            )}
          </section>

          <section className="grid gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Habit goals
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Weekly consistency tracked from workouts and check-ins.
              </p>
            </div>
            {habitGoals.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Repeat}
                    title="No habit goals yet"
                    description="Your coach can track weekly consistency like training frequency or check-ins."
                    className="py-4"
                  />
                </CardContent>
              </Card>
            ) : (
              habitGoals.map((goal) => (
                <HabitGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                />
              ))
            )}
          </section>

          <section className="grid gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Milestone goals
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Long-term milestones like session counts and training streaks.
              </p>
            </div>
            {milestoneGoals.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Flag}
                    title="No milestone goals yet"
                    description="Your coach can set long-term milestones like total sessions or training streaks."
                    className="py-4"
                  />
                </CardContent>
              </Card>
            ) : (
              milestoneGoals.map((goal) => (
                <MilestoneGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                />
              ))
            )}
          </section>

          <section className="grid gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Body composition goals
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Progress is measured from InBody scans or check-in weight when
                configured.
              </p>
            </div>

            {compositionGoals.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Scale}
                    title="No body composition goals yet"
                    description="Your coach can set weight, body fat, or muscle targets measured from InBody scans."
                    className="py-4"
                  />
                </CardContent>
              </Card>
            ) : (
              compositionGoals.map((goal) => (
                <GoalProgressCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}
