import { calculateE1rm } from '@/lib/workout-log'
import { mergeCoachNotesForHistory } from '@/lib/exercise-log-notes'
import type { createClient } from '@/lib/supabase/server'
import type {
  ClientScheduledWorkoutWithExercises,
  ExerciseHistorySession,
  ExerciseHistorySet,
  ExercisePreviousSets,
  WorkoutLogSet,
} from 'app/types/database'

export async function fetchWorkoutWithExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<ClientScheduledWorkoutWithExercises | null> {
  const { data, error } = await supabase
    .from('client_scheduled_workouts')
    .select(
      `
      *,
      exercises:scheduled_workout_exercises(
        *,
        exercise:exercises(id, name, muscle_group, equipment, external_id, image_url, demo_video_path, demo_video_url, instructions)
      )
    `
    )
    .eq('id', workoutId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const exercises = (data.exercises ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)

  return {
    ...data,
    exercises,
  } as ClientScheduledWorkoutWithExercises
}

export async function fetchLogSets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workoutId: string
): Promise<{ logSets: WorkoutLogSet[]; error: string | null }> {
  const { data, error } = await supabase
    .from('workout_log_sets')
    .select('*')
    .eq('scheduled_workout_id', workoutId)
    .order('set_number', { ascending: true })

  if (error) {
    return { logSets: [], error: error.message }
  }

  return { logSets: (data ?? []) as WorkoutLogSet[], error: null }
}

type HistoricalLogRow = {
  set_number: number
  weight: number | null
  reps: number | null
  duration_seconds: number | null
  distance_meters: number | null
  scheduled_workout_id: string
  scheduled_workout_exercises: { exercise_id: string }
  client_scheduled_workouts: {
    scheduled_date: string
    completed_at: string | null
  }
}

function sessionSortKey(workout: HistoricalLogRow['client_scheduled_workouts']): string {
  const completedAt = workout.completed_at?.trim()
  if (completedAt) return completedAt

  const scheduledDate = String(workout.scheduled_date ?? '').slice(0, 10)
  return scheduledDate ? `${scheduledDate}T23:59:59.999Z` : ''
}

function isUsablePreviousSet(row: HistoricalLogRow): boolean {
  return (
    row.reps != null ||
    row.duration_seconds != null ||
    row.distance_meters != null ||
    row.weight != null
  )
}

export async function fetchPreviousSetsForExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  workoutId: string,
  libraryExerciseIds: string[]
): Promise<{
  previousSetsByExerciseId: Record<string, ExercisePreviousSets>
  previousSessionDateByExerciseId: Record<string, string | null>
  previousSessionCoachNotesByExerciseId: Record<string, string | null>
}> {
  const previousSetsByExerciseId: Record<string, ExercisePreviousSets> = {}
  const previousSessionDateByExerciseId: Record<string, string | null> = {}
  const previousSessionCoachNotesByExerciseId: Record<string, string | null> =
    {}

  if (libraryExerciseIds.length === 0) {
    return {
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      previousSessionCoachNotesByExerciseId,
    }
  }

  const { data, error } = await supabase
    .from('workout_log_sets')
    .select(
      `
      set_number,
      weight,
      reps,
      duration_seconds,
      distance_meters,
      scheduled_workout_id,
      scheduled_workout_exercises!inner (exercise_id),
      client_scheduled_workouts!inner (client_id, scheduled_date, completed_at, status)
    `
    )
    .eq('client_scheduled_workouts.client_id', clientId)
    .eq('client_scheduled_workouts.status', 'completed')
    .eq('completed', true)
    .neq('scheduled_workout_id', workoutId)
    .in('scheduled_workout_exercises.exercise_id', libraryExerciseIds)

  if (error || !data) {
    return {
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      previousSessionCoachNotesByExerciseId,
    }
  }

  const rows = (data as HistoricalLogRow[]).filter(isUsablePreviousSet)
  const latestSessionKeyByExercise = new Map<string, string>()
  const latestWorkoutIdByExercise = new Map<string, string>()

  for (const row of rows) {
    const exerciseId = row.scheduled_workout_exercises.exercise_id
    const sortKey = sessionSortKey(row.client_scheduled_workouts)
    if (!sortKey) continue

    const sessionKey = `${sortKey}:${row.scheduled_workout_id}`
    const currentLatest = latestSessionKeyByExercise.get(exerciseId)

    if (!currentLatest || sessionKey > currentLatest) {
      latestSessionKeyByExercise.set(exerciseId, sessionKey)
      latestWorkoutIdByExercise.set(exerciseId, row.scheduled_workout_id)
    }
  }

  for (const row of rows) {
    const exerciseId = row.scheduled_workout_exercises.exercise_id
    const latestWorkoutId = latestWorkoutIdByExercise.get(exerciseId)

    if (!latestWorkoutId || row.scheduled_workout_id !== latestWorkoutId) {
      continue
    }

    if (!previousSetsByExerciseId[exerciseId]) {
      previousSetsByExerciseId[exerciseId] = {}
      previousSessionDateByExerciseId[exerciseId] = String(
        row.client_scheduled_workouts.scheduled_date ?? ''
      ).slice(0, 10)
    }

    previousSetsByExerciseId[exerciseId][row.set_number] = {
      weight: row.weight,
      reps: row.reps,
      durationSeconds: row.duration_seconds,
      distanceMeters: row.distance_meters,
    }
  }

  if (latestWorkoutIdByExercise.size > 0) {
    const workoutIds = Array.from(new Set(latestWorkoutIdByExercise.values()))
    const { data: noteRows } = await supabase
      .from('scheduled_workout_exercises')
      .select(
        'exercise_id, scheduled_workout_id, workout_notes, coach_session_notes'
      )
      .in('scheduled_workout_id', workoutIds)
      .in('exercise_id', libraryExerciseIds)

    for (const row of noteRows ?? []) {
      const latestWorkoutId = latestWorkoutIdByExercise.get(row.exercise_id)
      if (!latestWorkoutId || row.scheduled_workout_id !== latestWorkoutId) {
        continue
      }

      const coachNotes = mergeCoachNotesForHistory(
        row.workout_notes,
        row.coach_session_notes
      )
      if (coachNotes) {
        previousSessionCoachNotesByExerciseId[row.exercise_id] = coachNotes
      }
    }
  }

  return {
    previousSetsByExerciseId,
    previousSessionDateByExerciseId,
    previousSessionCoachNotesByExerciseId,
  }
}

type ExerciseHistoryRow = {
  set_number: number
  weight: number | null
  reps: number | null
  duration_seconds: number | null
  distance_meters: number | null
  completed: boolean
  scheduled_workout_id: string
  scheduled_workout_exercises: {
    exercise_id: string
    workout_notes: string | null
    coach_session_notes: string | null
    client_notes: string | null
  }
  client_scheduled_workouts: {
    id: string
    scheduled_date: string
    name: string | null
    status: string
  }
}

type ExerciseHistoryNotesRow = {
  workout_notes: string | null
  coach_session_notes: string | null
  client_notes: string | null
  client_scheduled_workouts: {
    id: string
    scheduled_date: string
    name: string | null
    status: string
  }
}

function createExerciseHistorySession(
  workout: ExerciseHistoryRow['client_scheduled_workouts'],
  notes?: Pick<
    ExerciseHistoryRow['scheduled_workout_exercises'],
    'workout_notes' | 'coach_session_notes' | 'client_notes'
  >
): ExerciseHistorySession {
  const date = String(workout.scheduled_date ?? '').slice(0, 10)
  return {
    workoutId: workout.id,
    date,
    workoutName: workout.name,
    sets: [],
    bestE1rm: null,
    coachNotes: mergeCoachNotesForHistory(
      notes?.workout_notes,
      notes?.coach_session_notes
    ),
    clientNotes: notes?.client_notes?.trim() || null,
  }
}

export async function fetchExerciseHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  libraryExerciseId: string,
  options?: { excludeWorkoutId?: string; limit?: number }
): Promise<ExerciseHistorySession[]> {
  const limit = options?.limit ?? 12

  let query = supabase
    .from('workout_log_sets')
    .select(
      `
      set_number,
      weight,
      reps,
      duration_seconds,
      distance_meters,
      completed,
      scheduled_workout_id,
      scheduled_workout_exercises!inner (exercise_id, workout_notes, coach_session_notes, client_notes),
      client_scheduled_workouts!inner (id, client_id, scheduled_date, name, status)
    `
    )
    .eq('client_scheduled_workouts.client_id', clientId)
    .eq('scheduled_workout_exercises.exercise_id', libraryExerciseId)
    .eq('client_scheduled_workouts.status', 'completed')
    .eq('completed', true)
    .order('scheduled_date', {
      ascending: false,
      referencedTable: 'client_scheduled_workouts',
    })

  if (options?.excludeWorkoutId) {
    query = query.neq('scheduled_workout_id', options.excludeWorkoutId)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  const rows = data as ExerciseHistoryRow[]
  const sessionsByWorkout = new Map<string, ExerciseHistorySession>()

  for (const row of rows) {
    const workout = row.client_scheduled_workouts
    const workoutId = workout.id
    const date = String(workout.scheduled_date ?? '').slice(0, 10)
    if (!date) continue

    let session = sessionsByWorkout.get(workoutId)
    if (!session) {
      session = createExerciseHistorySession(workout, row.scheduled_workout_exercises)
      sessionsByWorkout.set(workoutId, session)
    }

    const e1rm =
      row.weight != null && row.reps != null
        ? calculateE1rm(row.weight, row.reps)
        : null

    const historySet: ExerciseHistorySet = {
      setNumber: row.set_number,
      weight: row.weight,
      reps: row.reps,
      durationSeconds: row.duration_seconds,
      distanceMeters: row.distance_meters,
      e1rm,
    }

    session.sets.push(historySet)

    if (e1rm != null && (session.bestE1rm == null || e1rm > session.bestE1rm)) {
      session.bestE1rm = e1rm
    }
  }

  let notesQuery = supabase
    .from('scheduled_workout_exercises')
    .select(
      `
      workout_notes,
      coach_session_notes,
      client_notes,
      client_scheduled_workouts!inner (id, client_id, scheduled_date, name, status)
    `
    )
    .eq('exercise_id', libraryExerciseId)
    .eq('client_scheduled_workouts.client_id', clientId)
    .eq('client_scheduled_workouts.status', 'completed')
    .or(
      'workout_notes.not.is.null,coach_session_notes.not.is.null,client_notes.not.is.null'
    )
    .order('scheduled_date', {
      ascending: false,
      referencedTable: 'client_scheduled_workouts',
    })

  if (options?.excludeWorkoutId) {
    notesQuery = notesQuery.neq('scheduled_workout_id', options.excludeWorkoutId)
  }

  const { data: noteRows } = await notesQuery

  for (const row of (noteRows ?? []) as ExerciseHistoryNotesRow[]) {
    const workout = row.client_scheduled_workouts
    const workoutId = workout.id
    if (sessionsByWorkout.has(workoutId)) continue

    const date = String(workout.scheduled_date ?? '').slice(0, 10)
    if (!date) continue

    sessionsByWorkout.set(
      workoutId,
      createExerciseHistorySession(workout, row)
    )
  }

  return Array.from(sessionsByWorkout.values())
    .map((session) => ({
      ...session,
      sets: session.sets.sort((a, b) => a.setNumber - b.setNumber),
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}
