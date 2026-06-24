import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { PortalGoalsPanel } from '@/components/portal/portal-goals-panel'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import { partitionClientGoals } from '@/lib/goal-progress'
import { fetchGoalProgressContext } from '@/lib/goal-progress-context'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
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
    <div className="flex flex-col gap-4 md:gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Goals</h1>
        <p className="text-muted-foreground hidden text-sm leading-relaxed md:block">
          Daily targets, performance, habits, milestones, and body composition
          progress set by your coach.
        </p>
      </section>

      {!clientRecord ? (
        <PortalUnlinkedState feature="see your goals" />
      ) : goalsSchemaError?.includes('Could not find the table') ? (
        <SchemaSetupNotice
          tables={['client_goals']}
          sqlFile="apply-client-goals-v2.sql"
        />
      ) : (
        <PortalGoalsPanel
          dailyGoals={dailyGoals}
          compositionGoals={compositionGoals}
          performanceGoals={performanceGoals}
          habitGoals={habitGoals}
          milestoneGoals={milestoneGoals}
          progressContext={progressContext}
        />
      )}
    </div>
  )
}
