import type { CoachPreferences } from '@/lib/coach-preferences'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import type { Profile } from 'app/types/database'

export type CoachGettingStartedProgress = {
  hasClient: boolean
  hasProgramOrWorkout: boolean
  hasScheduledWorkout: boolean
}

type ProfilePreferenceRow = Pick<
  Profile,
  | 'weight_unit'
  | 'week_starts_on'
  | 'coach_timezone'
  | 'default_check_in_frequency'
>

export function coachPreferencesUnset(row?: ProfilePreferenceRow | null): boolean {
  if (!row) return true
  return (
    row.weight_unit == null &&
    row.week_starts_on == null &&
    row.coach_timezone == null &&
    row.default_check_in_frequency == null
  )
}

export function isGettingStartedComplete(
  progress: CoachGettingStartedProgress
): boolean {
  return (
    progress.hasClient &&
    progress.hasProgramOrWorkout &&
    progress.hasScheduledWorkout
  )
}

export async function fetchCoachGettingStartedProgress(
  supabase: Awaited<
    ReturnType<typeof import('@/lib/supabase/server').createClient>
  >,
  coachId: string
): Promise<CoachGettingStartedProgress> {
  const [
    { count: clientCount },
    { count: programCount },
    { count: workoutCount },
    { count: scheduledCount },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('is_coach_self', false),
    supabase
      .from('programs')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId),
    supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId),
    supabase
      .from('client_scheduled_workouts')
      .select('id, clients!inner(coach_id, is_coach_self)', {
        count: 'exact',
        head: true,
      })
      .eq('clients.coach_id', coachId)
      .eq('clients.is_coach_self', false),
  ])

  return {
    hasClient: (clientCount ?? 0) > 0,
    hasProgramOrWorkout: (programCount ?? 0) > 0 || (workoutCount ?? 0) > 0,
    hasScheduledWorkout: (scheduledCount ?? 0) > 0,
  }
}

const IANA_TO_COACH_TIMEZONE: Record<
  string,
  Exclude<CoachPreferences['timezone'], 'auto'>
> = {
  'America/New_York': 'america_new_york',
  'America/Detroit': 'america_new_york',
  'America/Chicago': 'america_chicago',
  'America/Denver': 'america_denver',
  'America/Los_Angeles': 'america_los_angeles',
  'America/Phoenix': 'america_denver',
  'Europe/London': 'europe_london',
}

export function guessCoachTimezoneFromBrowser(): CoachPreferences['timezone'] {
  if (typeof Intl === 'undefined') {
    return defaultCoachPreferences.timezone
  }

  try {
    const iana = Intl.DateTimeFormat().resolvedOptions().timeZone
    return IANA_TO_COACH_TIMEZONE[iana] ?? defaultCoachPreferences.timezone
  } catch {
    return defaultCoachPreferences.timezone
  }
}
