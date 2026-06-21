import { Suspense } from 'react'

import { AttendanceScopeTabs } from '@/components/attendance/attendance-scope-tabs'
import { PageHeader } from '@/components/dashboard/page-header'
import { LeaderboardCategoryTabs } from '@/components/leaderboards/leaderboard-category-tabs'
import { LeaderboardFormulaTabs } from '@/components/leaderboards/leaderboard-formula-tabs'
import { LeaderboardPeriodTabs } from '@/components/leaderboards/leaderboard-period-tabs'
import { LeaderboardTable } from '@/components/leaderboards/leaderboard-table'
import { LeaderboardToolbar } from '@/components/leaderboards/leaderboard-toolbar'
import { LeaderboardWeightClassFilter } from '@/components/leaderboards/leaderboard-weight-class-filter'
import {
  fetchAttendanceClients,
  fetchCoachTeams,
  parseAttendanceScope,
} from '@/lib/attendance'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import {
  fetchLeaderboardExercises,
  fetchLeaderboardRows,
} from '@/lib/leaderboard-queries'
import { getGymsForCoach } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'
import {
  parseLeaderboardExerciseId,
  parseLeaderboardFormula,
  parseLeaderboardMetric,
  parseLeaderboardPeriod,
  parseLeaderboardWeightClass,
} from '@/lib/validations/leaderboard'

export const metadata = {
  title: 'Leaderboards — Coaching App',
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string
    team?: string
    metric?: string
    period?: string
    exercise?: string
    formula?: string
    class?: string
  }>
}) {
  const {
    scope: scopeParam,
    team: teamParam,
    metric: metricParam,
    period: periodParam,
    exercise: exerciseParam,
    formula: formulaParam,
    class: classParam,
  } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : null
  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const coachTeams = user ? await fetchCoachTeams(supabase, user.id) : []
  const scope = parseAttendanceScope(
    scopeParam,
    teamParam,
    coachGymIds,
    coachGyms,
    coachTeams
  )
  const selectedTeamName = scope.teamId
    ? coachTeams.find((team) => team.id === scope.teamId)?.name
    : undefined

  const metric = parseLeaderboardMetric(metricParam)
  const period = parseLeaderboardPeriod(periodParam, metric)
  const exerciseId = parseLeaderboardExerciseId(exerciseParam)
  const formula = parseLeaderboardFormula(formulaParam)
  const weightClass = parseLeaderboardWeightClass(classParam)

  const [clients, exercises] = await Promise.all([
    user
      ? fetchAttendanceClients(supabase, {
          scope,
          coachGymIds,
          userId: user.id,
        })
      : Promise.resolve([]),
    fetchLeaderboardExercises(supabase),
  ])

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
    weekStartsOn: coachPreferences?.weekStartsOn ?? 'monday',
    weightUnit: coachPreferences?.weightUnit ?? 'lbs',
    teamId: scope.teamId,
    exercises,
    weightClass,
  })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Leaderboards"
        description="Rank athletes by strength PRs, Wilks/DOTS scores, consistency, volume, improvement, and training streaks."
      />

      <Suspense fallback={null}>
        <AttendanceScopeTabs gyms={coachGyms} teams={coachTeams} />
      </Suspense>

      <Suspense fallback={null}>
        <LeaderboardCategoryTabs />
      </Suspense>

      <Suspense fallback={null}>
        <LeaderboardPeriodTabs />
      </Suspense>

      <Suspense fallback={null}>
        <LeaderboardFormulaTabs />
      </Suspense>

      {scope.teamId ? (
        <Suspense fallback={null}>
          <LeaderboardWeightClassFilter weightClasses={availableWeightClasses} />
        </Suspense>
      ) : null}

      <Suspense fallback={null}>
        <LeaderboardToolbar
          exercises={exercises}
          resolvedExerciseId={resolvedExerciseId}
          resolvedExerciseName={resolvedExerciseName}
        />
      </Suspense>

      <LeaderboardTable
        rows={rows}
        metric={metric}
        exerciseName={resolvedExerciseName}
        teamName={selectedTeamName}
        periodLabel={periodLabel}
        showWeightClass={Boolean(scope.teamId) && !weightClass}
      />
    </div>
  )
}
