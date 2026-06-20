import { getWeekDayLabels, toDateKey } from '@/lib/calendar'
import { getCheckInPeriodBounds, getPortalCheckInDueLabel } from '@/lib/check-in-cadence'
import {
  defaultCoachPreferences,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import {
  calcClientCompletionRate,
  calcWorkoutStreak,
  getLastActiveLabel,
  type ClientWorkoutActivity,
} from '@/lib/client-metrics'
import { fetchClientLoadMetrics } from '@/lib/load-queries'
import type { RecentPrHighlight } from '@/lib/pr-records'
import { attachSignedUrlsToPhotos } from '@/lib/progress-photos'
import type { createClient } from '@/lib/supabase/server'
import type {
  CalendarDaySummary,
  ClientCheckIn,
  ClientProgressPhotoWithUrl,
} from 'app/types/database'

export type PortalCheckInStatus = 'due' | 'submitted' | 'reviewed'

export function getPortalCheckInStatus(
  periodCheckIn: ClientCheckIn | null
): PortalCheckInStatus {
  if (!periodCheckIn) return 'due'
  if (periodCheckIn.reviewed_at) return 'reviewed'
  return 'submitted'
}

export type PortalLoadMetrics = Awaited<
  ReturnType<typeof fetchClientLoadMetrics>
>

export function getPortalAcwrHint(
  variant: PortalLoadMetrics['acwrVariant'] | undefined
): string {
  switch (variant) {
    case 'success':
      return 'Load ratio in the healthy range (0.8–1.3)'
    case 'warning':
      return 'Recent load change — pace yourself and recover well'
    case 'secondary':
    default:
      return 'Needs more training history to calculate'
  }
}

export type PortalHomeData = {
  loadMetrics: Awaited<ReturnType<typeof fetchClientLoadMetrics>> | null
  weekSessions: CalendarDaySummary[]
  periodCheckIn: ClientCheckIn | null
  checkInStatus: PortalCheckInStatus
  checkInDueLabel: string
  streak: number
  completionRate: number | null
  lastActive: string
  recentPrs: RecentPrHighlight[]
}

export type PortalProgressData = {
  loadMetrics: Awaited<ReturnType<typeof fetchClientLoadMetrics>> | null
  streak: number
  completionRate: number | null
  lastActive: string
  recentPrs: RecentPrHighlight[]
  progressPhotos: ClientProgressPhotoWithUrl[]
  weekSessions: CalendarDaySummary[]
}

export async function fetchPortalHomeData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  coachPreferences: CoachPreferences = defaultCoachPreferences
): Promise<PortalHomeData> {
  const { start: periodStart, end: periodEnd } = getCheckInPeriodBounds(
    coachPreferences.defaultCheckInFrequency,
    coachPreferences.weekStartsOn,
    coachPreferences.timezone
  )
  const weekDateKeys = getWeekDayLabels(
    coachPreferences.weekStartsOn
  ).map((day) => day.dateKey)
  const weekStart = weekDateKeys[0]!
  const weekEnd = weekDateKeys[weekDateKeys.length - 1]!
  const streakStart = toDateKey(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() - 90
    )
  )

  const [
    loadMetricsResult,
    weekResult,
    periodCheckInResult,
    streakResult,
    recentWorkoutsResult,
  ] = await Promise.all([
    fetchClientLoadMetrics(supabase, clientId).catch(() => null),
    supabase
      .from('client_scheduled_workouts')
      .select('id, scheduled_date, name, status, started_at')
      .eq('client_id', clientId)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('client_check_ins')
      .select('*')
      .eq('client_id', clientId)
      .gte('check_in_date', periodStart)
      .lte('check_in_date', periodEnd)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('client_scheduled_workouts')
      .select('status, scheduled_date, completed_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('scheduled_date', streakStart)
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('client_scheduled_workouts')
      .select(
        'id, name, status, scheduled_date, started_at, completed_at, updated_at'
      )
      .eq('client_id', clientId)
      .in('status', ['completed', 'in_progress', 'skipped'])
      .order('updated_at', { ascending: false })
      .limit(12),
  ])

  const weekSessions = (weekResult.data ?? []) as CalendarDaySummary[]
  const periodCheckIn =
    (periodCheckInResult.data as ClientCheckIn | null) ?? null
  const streakWorkouts = (streakResult.data ?? []) as ClientWorkoutActivity[]
  const recentWorkouts = (recentWorkoutsResult.data ?? []) as ClientWorkoutActivity[]

  return {
    loadMetrics: loadMetricsResult,
    weekSessions,
    periodCheckIn,
    checkInStatus: getPortalCheckInStatus(periodCheckIn),
    checkInDueLabel: getPortalCheckInDueLabel(
      coachPreferences.defaultCheckInFrequency
    ),
    streak: calcWorkoutStreak(streakWorkouts),
    completionRate: calcClientCompletionRate(weekSessions),
    lastActive: getLastActiveLabel(recentWorkouts),
    recentPrs: loadMetricsResult?.recentPrs ?? [],
  }
}

export async function fetchPortalProgressData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  coachPreferences: CoachPreferences = defaultCoachPreferences
): Promise<PortalProgressData> {
  const weekDateKeys = getWeekDayLabels(
    coachPreferences.weekStartsOn
  ).map((day) => day.dateKey)
  const weekStart = weekDateKeys[0]!
  const weekEnd = weekDateKeys[weekDateKeys.length - 1]!
  const streakStart = toDateKey(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate() - 90
    )
  )

  const [
    loadMetricsResult,
    weekResult,
    streakResult,
    recentWorkoutsResult,
    progressPhotosResult,
  ] = await Promise.all([
    fetchClientLoadMetrics(supabase, clientId).catch(() => null),
    supabase
      .from('client_scheduled_workouts')
      .select('id, scheduled_date, name, status, started_at')
      .eq('client_id', clientId)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('client_scheduled_workouts')
      .select('status, scheduled_date, completed_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('scheduled_date', streakStart)
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('client_scheduled_workouts')
      .select(
        'id, name, status, scheduled_date, started_at, completed_at, updated_at'
      )
      .eq('client_id', clientId)
      .in('status', ['completed', 'in_progress', 'skipped'])
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('client_progress_photos')
      .select('*')
      .eq('client_id', clientId)
      .order('photo_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const weekSessions = (weekResult.data ?? []) as CalendarDaySummary[]
  const streakWorkouts = (streakResult.data ?? []) as ClientWorkoutActivity[]
  const recentWorkouts = (recentWorkoutsResult.data ?? []) as ClientWorkoutActivity[]
  const progressPhotos = await attachSignedUrlsToPhotos(
    supabase,
    progressPhotosResult.data ?? []
  )

  return {
    loadMetrics: loadMetricsResult,
    streak: calcWorkoutStreak(streakWorkouts),
    completionRate: calcClientCompletionRate(weekSessions),
    lastActive: getLastActiveLabel(recentWorkouts),
    recentPrs: loadMetricsResult?.recentPrs ?? [],
    progressPhotos,
    weekSessions,
  }
}
