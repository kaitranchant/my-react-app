import { toDateKey } from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { fetchAttendanceClients } from '@/lib/attendance'
import {
  fetchLeaderboardExercises,
  fetchLeaderboardRows,
} from '@/lib/leaderboard-queries'
import { getChallengePeriodBounds, LEADERBOARD_METRICS, formatChallengeDateRange } from '@/lib/leaderboard'
import {
  metricNeedsExercise,
  parseLeaderboardFormula,
  parseLeaderboardMetric,
  type LeaderboardFormula,
  type LeaderboardMetric,
} from '@/lib/validations/leaderboard'
import type { createClient } from '@/lib/supabase/server'
import type { TeamChallenge, TeamChallengeStatus } from 'app/types/database'

export type TeamChallengeDisplayStatus =
  | TeamChallengeStatus
  | 'upcoming'

export type TeamChallengeWithLeaderboard = {
  challenge: TeamChallenge
  displayStatus: TeamChallengeDisplayStatus
  metricLabel: string
  exerciseName: string | null
  periodLabel: string
  leaderboard: Awaited<ReturnType<typeof fetchLeaderboardRows>>
}

export function resolveChallengeDisplayStatus(
  challenge: Pick<TeamChallenge, 'status' | 'start_date' | 'end_date'>,
  today = toDateKey(new Date())
): TeamChallengeDisplayStatus {
  if (
    challenge.status === 'draft' ||
    challenge.status === 'cancelled' ||
    challenge.status === 'completed'
  ) {
    return challenge.status
  }

  if (challenge.end_date < today) return 'completed'
  if (challenge.start_date > today) return 'upcoming'
  return 'active'
}

export function getChallengeMetricLabel(metric: string): string {
  const parsed = parseLeaderboardMetric(metric)
  return (
    LEADERBOARD_METRICS.find((entry) => entry.id === parsed)?.label ?? metric
  )
}

export function isChallengeVisibleToClient(
  challenge: Pick<TeamChallenge, 'status'>
): boolean {
  return challenge.status === 'active' || challenge.status === 'completed'
}

export async function fetchTeamChallenges(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  options?: {
    clientVisibleOnly?: boolean
  }
): Promise<TeamChallenge[]> {
  let query = supabase
    .from('team_challenges')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (options?.clientVisibleOnly) {
    query = query.in('status', ['active', 'completed'])
  }

  const { data, error } = await query
  if (error || !data) return []
  return data as TeamChallenge[]
}

export async function fetchTeamChallengeById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challengeId: string
): Promise<TeamChallenge | null> {
  const { data, error } = await supabase
    .from('team_challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle()

  if (error || !data) return null
  return data as TeamChallenge
}

export async function fetchChallengeLeaderboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challenge: TeamChallenge,
  coachPreferences: CoachPreferences,
  coachId: string
): Promise<Awaited<ReturnType<typeof fetchLeaderboardRows>>> {
  const metric = parseLeaderboardMetric(challenge.metric)
  const formula = parseLeaderboardFormula(challenge.formula ?? undefined)
  const bounds = getChallengePeriodBounds(
    challenge.start_date,
    challenge.end_date
  )

  const [clients, exercises] = await Promise.all([
    fetchAttendanceClients(supabase, {
      scope: { kind: 'all', teamId: challenge.team_id },
      coachGymIds: new Set(),
      userId: coachId,
    }),
    fetchLeaderboardExercises(supabase),
  ])

  return fetchLeaderboardRows(supabase, {
    clients,
    metric,
    period: 'month',
    exerciseId: challenge.exercise_id,
    formula,
    weekStartsOn: coachPreferences.weekStartsOn,
    weightUnit: coachPreferences.weightUnit,
    teamId: challenge.team_id,
    exercises,
    weightClass: challenge.weight_class_filter,
    customBounds: bounds,
    includeRankChanges: false,
  })
}

export async function fetchTeamChallengeWithLeaderboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  challenge: TeamChallenge,
  coachPreferences: CoachPreferences,
  coachId: string
): Promise<TeamChallengeWithLeaderboard> {
  const displayStatus = resolveChallengeDisplayStatus(challenge)
  const metricLabel = getChallengeMetricLabel(challenge.metric)
  const periodLabel = formatChallengeDateRange(
    challenge.start_date,
    challenge.end_date
  )

  if (displayStatus === 'draft' || displayStatus === 'cancelled') {
    return {
      challenge,
      displayStatus,
      metricLabel,
      exerciseName: null,
      periodLabel,
      leaderboard: {
        rows: [],
        resolvedExerciseId: challenge.exercise_id,
        resolvedExerciseName: null,
        availableWeightClasses: [],
        periodLabel,
      },
    }
  }

  const leaderboard = await fetchChallengeLeaderboard(
    supabase,
    challenge,
    coachPreferences,
    coachId
  )

  return {
    challenge,
    displayStatus,
    metricLabel,
    exerciseName: leaderboard.resolvedExerciseName,
    periodLabel: leaderboard.periodLabel,
    leaderboard,
  }
}

export async function fetchTeamChallengesWithLeaderboards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  coachId: string,
  coachPreferences: CoachPreferences,
  options?: {
    clientVisibleOnly?: boolean
  }
): Promise<TeamChallengeWithLeaderboard[]> {
  const challenges = await fetchTeamChallenges(supabase, teamId, options)
  return Promise.all(
    challenges.map((challenge) =>
      fetchTeamChallengeWithLeaderboard(
        supabase,
        challenge,
        coachPreferences,
        coachId
      )
    )
  )
}

export function challengeNeedsExercise(metric: string): boolean {
  return metricNeedsExercise(parseLeaderboardMetric(metric))
}

export function challengeSupportsFormula(metric: string): boolean {
  return parseLeaderboardMetric(metric) === 'relative_strength'
}

export function getDefaultChallengeMetric(): LeaderboardMetric {
  return 'volume'
}

export function getDefaultChallengeFormula(): LeaderboardFormula {
  return 'dots'
}
