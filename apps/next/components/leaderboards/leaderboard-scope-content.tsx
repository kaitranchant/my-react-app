import { createClient } from '@/lib/supabase/server'
import { fetchAttendanceClients, parseAttendanceScope } from '@/lib/attendance'
import { LeaderboardResults } from '@/components/leaderboards/leaderboard-results'
import type { CoachTeam } from '@/lib/attendance'

import type { WeekStartsOn, WeightUnit } from 'app/types/database'

type LeaderboardScopeContentProps = {
  searchParams: {
    scope?: string
    team?: string
    metric?: string
    period?: string
    exercise?: string
    formula?: string
    class?: string
  }
  userId: string
  coachGyms: { id: string; name: string }[]
  coachTeams: CoachTeam[]
  weekStartsOn: WeekStartsOn
  weightUnit: WeightUnit
}

export async function LeaderboardScopeContent({
  searchParams,
  userId,
  coachGyms,
  coachTeams,
  weekStartsOn,
  weightUnit,
}: LeaderboardScopeContentProps) {
  const supabase = await createClient()
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const scope = parseAttendanceScope(
    searchParams.scope,
    searchParams.team,
    coachGymIds,
    coachGyms,
    coachTeams
  )
  const selectedTeamName = scope.teamId
    ? coachTeams.find((team) => team.id === scope.teamId)?.name
    : undefined

  const clients = await fetchAttendanceClients(supabase, {
    scope,
    coachGymIds,
    userId,
  })

  return (
    <LeaderboardResults
      clients={clients}
      teamId={scope.teamId}
      selectedTeamName={selectedTeamName}
      metricParam={searchParams.metric}
      periodParam={searchParams.period}
      exerciseParam={searchParams.exercise}
      formulaParam={searchParams.formula}
      classParam={searchParams.class}
      weekStartsOn={weekStartsOn}
      weightUnit={weightUnit}
    />
  )
}
