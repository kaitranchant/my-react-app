import { createClient } from '@/lib/supabase/server'
import { getMonthDateRange, toDateKey } from '@/lib/calendar'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { ClientDetailTrainingSection } from '@/components/clients/client-detail-training-section'
import type {
  CalendarDaySummary,
  ClientProgramAssignment,
  ClientScheduledWorkoutWithExercises,
  Program,
  Workout,
} from 'app/types/database'

type ClientDetailTrainingPanelProps = {
  clientId: string
  clientName: string
  coachUserId: string | null
  isCoachSelf?: boolean
}

/**
 * Calendar-first training panel: month + selected day paint without waiting
 * for the full exercise catalog seed/load (that happens when the builder opens).
 */
export async function ClientDetailTrainingPanel({
  clientId,
  clientName,
  coachUserId,
  isCoachSelf = false,
}: ClientDetailTrainingPanelProps) {
  const supabase = await createClient()
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const selectedDate = toDateKey(today)
  const { start: monthStart, end: monthEnd } = getMonthDateRange(year, month)

  const [
    coachPreferences,
    { data: assignmentData },
    { data: programsData },
    monthResult,
    selectedResult,
    workoutsResult,
  ] = await Promise.all([
    coachUserId
      ? getCoachPreferencesForUser(coachUserId)
      : Promise.resolve(defaultCoachPreferences),
    supabase
      .from('program_assignments')
      .select('*, program:programs(id, name, description, status), team:teams(id, name)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('programs')
      .select('id, name, status')
      .order('name', { ascending: true }),
    supabase
      .from('client_scheduled_workouts')
      .select('id, scheduled_date, name, status, started_at')
      .eq('client_id', clientId)
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd)
      .order('scheduled_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('client_scheduled_workouts')
      .select(
        `
        *,
        exercises:scheduled_workout_exercises(
          *,
          exercise:exercises(id, name, muscle_group, equipment)
        )
      `
      )
      .eq('client_id', clientId)
      .eq('scheduled_date', selectedDate)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('workouts')
      .select('id, name, status')
      .neq('status', 'archived')
      .order('name', { ascending: true }),
  ])

  const activeAssignment = assignmentData
    ? (assignmentData as ClientProgramAssignment)
    : null
  const availablePrograms = (programsData ?? []) as Pick<
    Program,
    'id' | 'name' | 'status'
  >[]

  let selectedWorkout: ClientScheduledWorkoutWithExercises | null = null
  if (selectedResult.data) {
    const exercises = (selectedResult.data.exercises ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
    selectedWorkout = {
      ...selectedResult.data,
      exercises,
    } as ClientScheduledWorkoutWithExercises
  }

  const libraryWorkouts = (workoutsResult.data ?? []) as Pick<
    Workout,
    'id' | 'name' | 'status'
  >[]

  return (
    <ClientDetailTrainingSection
      clientId={clientId}
      clientName={clientName}
      activeAssignment={activeAssignment}
      availablePrograms={availablePrograms}
      personalMode={isCoachSelf}
      calendar={{
        schemaError: monthResult.error?.message ?? null,
        year,
        month,
        selectedDate,
        days: (monthResult.data ?? []) as CalendarDaySummary[],
        selectedWorkout,
        // Loaded on demand when opening the workout builder / log replace UI.
        exercises: [],
        libraryWorkouts,
      }}
      coachPreferences={coachPreferences}
    />
  )
}
