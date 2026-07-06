import { notFound } from 'next/navigation'

import { WorkoutLogPage } from '@/components/calendar/workout-log-page'
import { coerceDateKey } from '@/lib/calendar'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { requireClientAccess } from '@/lib/gym-access'
import { getWorkoutLogReturnHref } from '@/lib/workout-log-routes'
import type { Exercise, ScheduledWorkoutStatus } from 'app/types/database'

type CoachWorkoutLogPageOptions = {
  clientId: string
  workoutId: string
  date?: string | null
}

export async function getCoachWorkoutLogPageProps({
  clientId,
  workoutId,
  date,
}: CoachWorkoutLogPageOptions) {
  const access = await requireClientAccess(clientId)
  if (!access) {
    notFound()
  }

  const { supabase, user, client } = access

  const [{ data: workout }, { data: exercises }] = await Promise.all([
    supabase
      .from('client_scheduled_workouts')
      .select('id, status, scheduled_date')
      .eq('id', workoutId)
      .eq('client_id', clientId)
      .maybeSingle(),
    supabase
      .from('exercises')
      .select('id, name, muscle_group, external_id')
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ])

  if (!workout) {
    notFound()
  }

  const selectedDate = coerceDateKey(date) ?? workout.scheduled_date
  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : defaultCoachPreferences

  return {
    clientId,
    workoutId: workout.id,
    selectedDate,
    initialStatus: workout.status as ScheduledWorkoutStatus,
    exercises: (exercises ?? []) as Pick<
      Exercise,
      'id' | 'name' | 'muscle_group' | 'external_id'
    >[],
    variant: 'coach' as const,
    weightUnit: coachPreferences.weightUnit,
    defaultSessionViewMode: coachPreferences.defaultWorkoutLogView,
    returnHref: getWorkoutLogReturnHref(selectedDate, {
      variant: 'coach',
      clientId,
    }),
  }
}
