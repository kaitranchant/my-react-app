import { Suspense } from 'react'

import { LeaderboardCategoryTabs } from '@/components/leaderboards/leaderboard-category-tabs'
import { LeaderboardFormulaTabs } from '@/components/leaderboards/leaderboard-formula-tabs'
import { LeaderboardPeriodTabs } from '@/components/leaderboards/leaderboard-period-tabs'
import { LeaderboardTable } from '@/components/leaderboards/leaderboard-table'
import { LeaderboardToolbar } from '@/components/leaderboards/leaderboard-toolbar'
import { LeaderboardWeightClassFilter } from '@/components/leaderboards/leaderboard-weight-class-filter'
import { PortalSectionSkeleton } from '@/components/portal/portal-page-skeletons'
import { PortalLeaderboardProfileCard } from '@/components/portal/portal-leaderboard-profile-card'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { fetchAttendanceClients } from '@/lib/attendance'
import { getPortalDisplayPreferences } from '@/lib/coach-preferences-server'
import {
  fetchLeaderboardExercises,
  fetchLeaderboardRows,
} from '@/lib/leaderboard-queries'
import { getPortalClientContext } from '@/lib/portal-client'
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

export default async function PortalLeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    metric?: string
    period?: string
    exercise?: string
    formula?: string
    class?: string
    team?: string
  }>
}) {
  const {
    metric: metricParam,
    period: periodParam,
    exercise: exerciseParam,
    formula: formulaParam,
    class: classParam,
    team: teamParam,
  } = await searchParams

  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  if (!portalCtx || !clientRecord) {
    return (
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="page-title">Leaderboards</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            See how you rank against teammates.
          </p>
        </section>
        <PortalUnlinkedState feature="view team leaderboards" />
      </div>
    )
  }

  if (clientRecord.leaderboard_opt_out) {
    return (
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="page-title">Leaderboards</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Team rankings are hidden for your profile.
          </p>
        </section>
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            You are opted out of leaderboards. Ask your coach if you want to
            appear on team rankings.
          </CardContent>
        </Card>
      </div>
    )
  }

  const supabase = portalCtx.supabase
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const displayPreferences = await getPortalDisplayPreferences(
    user.id,
    clientRecord.coach_id
  )
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id, team:teams(id, name)')
    .eq('client_id', clientRecord.id)
    .order('joined_at', { ascending: true })

  const teams =
    memberships?.flatMap((row) => {
      const teamRaw = row.team as { id: string; name: string } | { id: string; name: string }[] | null
      const team = Array.isArray(teamRaw) ? teamRaw[0] : teamRaw
      return team ? [team] : []
    }) ?? []

  const selectedTeam =
    teams.find((team) => team.id === teamParam) ?? teams[0] ?? null

  if (!selectedTeam) {
    return (
      <div className="flex flex-col gap-6">
        <section className="space-y-1">
          <h1 className="page-title">Leaderboards</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Compete with teammates on strength, consistency, and improvement.
          </p>
        </section>
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            You are not on a team yet. Once your coach adds you to a team,
            rankings will appear here.
          </CardContent>
        </Card>
      </div>
    )
  }

  const coachPreferences = displayPreferences
  const metric = parseLeaderboardMetric(metricParam)
  const period = parseLeaderboardPeriod(periodParam, metric)
  const exerciseId = parseLeaderboardExerciseId(exerciseParam)
  const formula = parseLeaderboardFormula(formulaParam)
  const weightClass = parseLeaderboardWeightClass(classParam)

  const [clients, exercises] = await Promise.all([
    fetchAttendanceClients(supabase, {
      scope: { kind: 'all', teamId: selectedTeam.id },
      coachGymIds: new Set(),
      userId: clientRecord.coach_id,
    }),
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
    weekStartsOn: coachPreferences.weekStartsOn,
    weightUnit: coachPreferences.weightUnit,
    teamId: selectedTeam.id,
    exercises,
    weightClass,
  })

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Leaderboards</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {selectedTeam.name} rankings — strength, Wilks/DOTS, consistency,
          volume, and improvement.
        </p>
      </section>

      <PortalLeaderboardProfileCard
        defaultBiologicalSex={clientRecord.biological_sex ?? null}
      />

      <Suspense fallback={<PortalSectionSkeleton rows={1} />}>
        <LeaderboardCategoryTabs />
      </Suspense>

      <Suspense fallback={<PortalSectionSkeleton rows={1} />}>
        <LeaderboardPeriodTabs />
      </Suspense>

      <Suspense fallback={<PortalSectionSkeleton rows={1} />}>
        <LeaderboardFormulaTabs />
      </Suspense>

      <Suspense fallback={<PortalSectionSkeleton rows={1} />}>
        <LeaderboardWeightClassFilter weightClasses={availableWeightClasses} />
      </Suspense>

      <Suspense fallback={<PortalSectionSkeleton rows={4} />}>
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
        teamName={selectedTeam.name}
        periodLabel={periodLabel}
        showWeightClass={!weightClass}
        readOnly
      />
    </div>
  )
}
