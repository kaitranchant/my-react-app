import { Suspense } from 'react'

import { createClient } from '@/lib/supabase/server'
import {
  fetchLeaderboardExercises,
  fetchLeaderboardRows,
} from '@/lib/leaderboard-queries'
import { leaderboardResultsSuspenseKey } from '@/lib/leaderboard-page-data'
import { LeaderboardTable } from '@/components/leaderboards/leaderboard-table'
import { LeaderboardToolbar } from '@/components/leaderboards/leaderboard-toolbar'
import { LeaderboardWeightClassFilter } from '@/components/leaderboards/leaderboard-weight-class-filter'
import { LeaderboardResultsSkeleton } from '@/components/leaderboards/leaderboard-results-skeleton'
import type { AttendanceClientRow } from '@/lib/attendance'
import {
  parseLeaderboardExerciseId,
  parseLeaderboardFormula,
  parseLeaderboardMetric,
  parseLeaderboardPeriod,
  parseLeaderboardWeightClass,
} from '@/lib/validations/leaderboard'
import type { WeekStartsOn, WeightUnit } from 'app/types/database'

type LeaderboardResultsProps = {
  clients: AttendanceClientRow[]
  teamId?: string
  selectedTeamName?: string
  metricParam?: string
  periodParam?: string
  exerciseParam?: string
  formulaParam?: string
  classParam?: string
  weekStartsOn: WeekStartsOn
  weightUnit: WeightUnit
}

async function LeaderboardResultsContent({
  clients,
  teamId,
  selectedTeamName,
  metricParam,
  periodParam,
  exerciseParam,
  formulaParam,
  classParam,
  weekStartsOn,
  weightUnit,
}: LeaderboardResultsProps) {
  const supabase = await createClient()
  const metric = parseLeaderboardMetric(metricParam)
  const period = parseLeaderboardPeriod(periodParam, metric)
  const exerciseId = parseLeaderboardExerciseId(exerciseParam)
  const formula = parseLeaderboardFormula(formulaParam)
  const weightClass = parseLeaderboardWeightClass(classParam)

  const exercises = await fetchLeaderboardExercises(supabase)
  const {
    rows,
    resolvedExerciseId,
    resolvedExerciseName,
    availableWeightClasses,
    periodLabel,
  } = await fetchLeaderboardRows(supabase, {
    clients,
    metric,
    period,
    exerciseId,
    formula,
    weekStartsOn,
    weightUnit,
    teamId,
    exercises,
    weightClass,
  })

  return (
    <>
      {teamId ? (
        <LeaderboardWeightClassFilter weightClasses={availableWeightClasses} />
      ) : null}

      <LeaderboardToolbar
        exercises={exercises}
        resolvedExerciseId={resolvedExerciseId}
        resolvedExerciseName={resolvedExerciseName}
      />

      <LeaderboardTable
        rows={rows}
        metric={metric}
        exerciseName={resolvedExerciseName}
        teamName={selectedTeamName}
        periodLabel={periodLabel}
        showWeightClass={Boolean(teamId) && !weightClass}
      />
    </>
  )
}

export function LeaderboardResults(props: LeaderboardResultsProps) {
  return (
    <Suspense
      key={leaderboardResultsSuspenseKey({
        metric: props.metricParam,
        period: props.periodParam,
        exercise: props.exerciseParam,
        formula: props.formulaParam,
        class: props.classParam,
      })}
      fallback={<LeaderboardResultsSkeleton />}
    >
      <LeaderboardResultsContent {...props} />
    </Suspense>
  )
}
