import {
  addDaysToDateKey,
  getWeekStartDateKey,
  toDateKey,
} from '@/lib/calendar'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { getCoachDateKey } from '@/lib/coach-preferences'
import { parseTrackingOptions } from '@/lib/scheduled-exercise'
import type { createClient } from '@/lib/supabase/server'
import {
  previousSessionMetTargets,
  suggestProgressiveLoadWeight,
  type PreviousSetLog,
} from '@/lib/workout-log'

export { parseTargetWeight } from '@/lib/workout-log'
import type {
  ScheduledWorkoutExerciseWithDetails,
  WeekStartsOn,
} from 'app/types/database'

export type ProgressiveOverloadSuggestion = {
  sourceScheduledExerciseId: string
  sourceWorkoutId: string
  sourceSessionDate: string
  sourceWorkoutName: string
  clientId: string
  clientName: string
  avatarUrl: string | null
  exerciseId: string
  exerciseName: string
  previousWeight: number
  suggestedWeight: number
  upcomingSessionCount: number
}

export type ProgressiveOverloadWeekBounds = {
  start: string
  end: string
  label: string
}

export function getLastWeekBounds(
  weekStartsOn: WeekStartsOn = 'monday',
  referenceDate = new Date()
): ProgressiveOverloadWeekBounds {
  const currentWeekStart = getWeekStartDateKey(
    toDateKey(referenceDate),
    weekStartsOn
  )
  const lastWeekStart = addDaysToDateKey(currentWeekStart, -7)
  const lastWeekEnd = addDaysToDateKey(lastWeekStart, 6)

  return {
    start: lastWeekStart,
    end: lastWeekEnd,
    label: 'Last week',
  }
}

export function getThisWeekBounds(
  weekStartsOn: WeekStartsOn = 'monday',
  referenceDate = new Date()
): ProgressiveOverloadWeekBounds {
  const start = getWeekStartDateKey(toDateKey(referenceDate), weekStartsOn)
  const end = addDaysToDateKey(start, 6)

  return {
    start,
    end,
    label: 'This week',
  }
}

export function formatTargetWeight(
  weight: number,
  unit: 'lbs' | 'kg' = 'lbs'
): string {
  const rounded =
    weight % 1 === 0 ? String(Math.round(weight)) : weight.toFixed(1)
  return `${rounded} ${unit}`
}

type UpcomingExerciseRow = Pick<
  ScheduledWorkoutExerciseWithDetails,
  'id' | 'exercise_id' | 'tracking_options' | 'weight_percent'
>

type ExerciseRow = Pick<
  ScheduledWorkoutExerciseWithDetails,
  | 'id'
  | 'exercise_id'
  | 'sets'
  | 'reps'
  | 'prescription'
  | 'weight_percent'
  | 'tracking_options'
> & {
  exercise: { id: string; name: string } | { id: string; name: string }[] | null
}

type CompletedWorkoutRow = {
  id: string
  name: string
  scheduled_date: string
  client_id: string
  exercises: ExerciseRow[] | null
}

type LogSetRow = {
  set_number: number
  weight: number | null
  reps: number | null
  scheduled_exercise_id: string
}

function normalizeExercise(
  exercise: ExerciseRow['exercise']
): { id: string; name: string } | null {
  if (!exercise) return null
  return Array.isArray(exercise) ? exercise[0] ?? null : exercise
}

function isEligibleForProgression(
  row: Pick<
    ScheduledWorkoutExerciseWithDetails,
    'tracking_options' | 'weight_percent'
  >
): boolean {
  const options = parseTrackingOptions(row.tracking_options)
  if (!options.autoProgressLoad) return false
  if (options.bodyweight || options.completionLift) return false
  if (row.weight_percent?.trim()) return false
  return true
}

function buildPreviousSets(
  logSets: LogSetRow[],
  scheduledExerciseId: string
): Record<number, PreviousSetLog> {
  const previousSets: Record<number, PreviousSetLog> = {}

  for (const set of logSets) {
    if (set.scheduled_exercise_id !== scheduledExerciseId) continue
    if (set.weight == null || set.reps == null) continue
    previousSets[set.set_number] = {
      weight: set.weight,
      reps: set.reps,
    }
  }

  return previousSets
}

function toExerciseWithDetails(
  row: ExerciseRow,
  workoutId: string
): ScheduledWorkoutExerciseWithDetails {
  const exercise = normalizeExercise(row.exercise)

  return {
    ...row,
    scheduled_workout_id: workoutId,
    sort_order: 0,
    superset_group: null,
    exercise_block: null,
    workout_notes: null,
    client_notes: null,
    rep_mode: 'reps',
    each_side: false,
    tempo: null,
    rest_seconds: null,
    rpe_target: null,
    target_weight: null,
    created_at: '',
    updated_at: '',
    exercise: exercise ?? {
      id: row.exercise_id,
      name: 'Exercise',
      muscle_group: null,
      equipment: null,
      external_id: null,
      image_url: null,
      instructions: null,
    },
  } as ScheduledWorkoutExerciseWithDetails
}

export function buildSuggestionFromSession(
  workout: CompletedWorkoutRow,
  exerciseRow: ExerciseRow,
  previousSets: Record<number, PreviousSetLog>,
  client: { id: string; full_name: string; avatar_url: string | null },
  upcomingSessionCount: number
): ProgressiveOverloadSuggestion | null {
  if (!isEligibleForProgression(exerciseRow)) return null

  const exercise = normalizeExercise(exerciseRow.exercise)
  if (!exercise) return null

  const exerciseWithDetails = toExerciseWithDetails(exerciseRow, workout.id)
  if (!previousSessionMetTargets(exerciseWithDetails, previousSets)) {
    return null
  }

  const suggestedWeight = suggestProgressiveLoadWeight(
    exerciseWithDetails,
    previousSets
  )
  if (suggestedWeight == null) return null

  const weights = Object.values(previousSets).map((set) => set.weight)
  if (weights.length === 0) return null

  const previousWeight = Math.max(...weights)
  if (suggestedWeight <= previousWeight) return null

  return {
    sourceScheduledExerciseId: exerciseRow.id,
    sourceWorkoutId: workout.id,
    sourceSessionDate: workout.scheduled_date,
    sourceWorkoutName: workout.name,
    clientId: client.id,
    clientName: client.full_name,
    avatarUrl: client.avatar_url,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    previousWeight,
    suggestedWeight,
    upcomingSessionCount,
  }
}

export async function fetchProgressiveOverloadSuggestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  coachPreferences: CoachPreferences
): Promise<{
  suggestions: ProgressiveOverloadSuggestion[]
  weekLabel: string
  schemaError: string | null
}> {
  const lastWeek = getLastWeekBounds(coachPreferences.weekStartsOn)
  const today = getCoachDateKey(coachPreferences.timezone)
  const thisWeek = getThisWeekBounds(coachPreferences.weekStartsOn)

  const { data: clientsData, error: clientsError } = await supabase
    .from('clients')
    .select('id, full_name, avatar_url')
    .eq('coach_id', coachId)
    .eq('status', 'active')
    .eq('is_coach_self', false)
    .order('full_name', { ascending: true })

  if (clientsError) {
    return {
      suggestions: [],
      weekLabel: lastWeek.label,
      schemaError: clientsError.message,
    }
  }

  const clients = clientsData ?? []
  if (clients.length === 0) {
    return { suggestions: [], weekLabel: lastWeek.label, schemaError: null }
  }

  const clientIds = clients.map((client) => client.id)
  const clientsById = new Map(clients.map((client) => [client.id, client]))

  const { data: workoutsData, error: workoutsError } = await supabase
    .from('client_scheduled_workouts')
    .select(
      `
      id,
      name,
      scheduled_date,
      client_id,
      exercises:scheduled_workout_exercises(
        id,
        exercise_id,
        sets,
        reps,
        prescription,
        weight_percent,
        tracking_options,
        exercise:exercises(id, name)
      )
    `
    )
    .in('client_id', clientIds)
    .eq('status', 'completed')
    .gte('scheduled_date', lastWeek.start)
    .lte('scheduled_date', lastWeek.end)

  if (workoutsError) {
    const schemaError = workoutsError.message.includes('Could not find the table')
      ? workoutsError.message
      : workoutsError.message
    return { suggestions: [], weekLabel: lastWeek.label, schemaError }
  }

  const workouts = (workoutsData ?? []) as CompletedWorkoutRow[]
  if (workouts.length === 0) {
    return { suggestions: [], weekLabel: lastWeek.label, schemaError: null }
  }

  const workoutIds = workouts.map((workout) => workout.id)

  const [
    { data: logSetsData, error: logSetsError },
    { data: decisionsData, error: decisionsError },
    { data: upcomingData, error: upcomingError },
  ] = await Promise.all([
    supabase
      .from('workout_log_sets')
      .select('set_number, weight, reps, scheduled_exercise_id')
      .in('scheduled_workout_id', workoutIds),
    supabase
      .from('progressive_overload_decisions')
      .select('source_scheduled_exercise_id')
      .eq('coach_id', coachId),
    supabase
      .from('client_scheduled_workouts')
      .select(
        `
        id,
        scheduled_date,
        client_id,
        exercises:scheduled_workout_exercises(
          id,
          exercise_id,
          tracking_options,
          weight_percent
        )
      `
      )
      .in('client_id', clientIds)
      .gte('scheduled_date', today)
      .lte('scheduled_date', thisWeek.end)
      .in('status', ['scheduled', 'in_progress']),
  ])

  const schemaError =
    logSetsError?.message ??
    decisionsError?.message ??
    upcomingError?.message ??
    null

  if (schemaError?.includes('Could not find the table')) {
    return { suggestions: [], weekLabel: lastWeek.label, schemaError }
  }

  const decidedIds = new Set(
    (decisionsData ?? []).map((row) => row.source_scheduled_exercise_id)
  )
  const logSets = (logSetsData ?? []) as LogSetRow[]

  const upcomingCountByClientExercise = new Map<string, number>()
  for (const workout of (upcomingData ?? []) as Array<{
    client_id: string
    exercises: UpcomingExerciseRow[] | null
  }>) {
    for (const row of workout.exercises ?? []) {
      if (!isEligibleForProgression(row)) continue
      const key = `${workout.client_id}:${row.exercise_id}`
      upcomingCountByClientExercise.set(
        key,
        (upcomingCountByClientExercise.get(key) ?? 0) + 1
      )
    }
  }

  const suggestions: ProgressiveOverloadSuggestion[] = []

  for (const workout of workouts) {
    const client = clientsById.get(workout.client_id)
    if (!client) continue

    for (const exerciseRow of workout.exercises ?? []) {
      if (decidedIds.has(exerciseRow.id)) continue

      const previousSets = buildPreviousSets(logSets, exerciseRow.id)
      const upcomingSessionCount =
        upcomingCountByClientExercise.get(
          `${workout.client_id}:${exerciseRow.exercise_id}`
        ) ?? 0

      const suggestion = buildSuggestionFromSession(
        workout,
        exerciseRow,
        previousSets,
        client,
        upcomingSessionCount
      )

      if (suggestion) {
        suggestions.push(suggestion)
      }
    }
  }

  suggestions.sort((a, b) => {
    if (b.upcomingSessionCount !== a.upcomingSessionCount) {
      return b.upcomingSessionCount - a.upcomingSessionCount
    }
    return a.clientName.localeCompare(b.clientName)
  })

  return { suggestions, weekLabel: lastWeek.label, schemaError: null }
}

export async function countPendingProgressiveOverloadSuggestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  coachPreferences: CoachPreferences
): Promise<number> {
  const result = await fetchProgressiveOverloadSuggestions(
    supabase,
    coachId,
    coachPreferences
  )
  return result.suggestions.length
}
