import type { createClient } from '@/lib/supabase/server'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type {
  ClientCheckIn,
  ClientGoalMetadata,
  ClientInbodyScan,
  ClientNutritionLog,
  ClientProgramAssignment,
  ClientScheduledWorkout,
  Exercise,
  ExercisePrRecord,
} from 'app/types/database'

export type GoalProgressContext = {
  scans: ClientInbodyScan[]
  checkIns: ClientCheckIn[]
  nutritionLogs: ClientNutritionLog[]
  prRecords: ExercisePrRecord[]
  bestDurationByExerciseId: Record<string, number>
  workouts: Pick<
    ClientScheduledWorkout,
    'id' | 'status' | 'scheduled_date' | 'completed_at'
  >[]
  activeAssignment: ClientProgramAssignment | null
  programDayOffsets: number[]
  exercises: Pick<Exercise, 'id' | 'name'>[]
}

type WorkoutLogDurationRow = {
  duration_seconds: number | null
  completed: boolean
  scheduled_workout_exercises: {
    exercise_id: string
  }
  client_scheduled_workouts: {
    status: string
  }
}

function buildBestDurationByExerciseId(
  rows: WorkoutLogDurationRow[]
): Record<string, number> {
  const bestByExercise: Record<string, number> = {}

  for (const row of rows) {
    if (row.client_scheduled_workouts.status !== 'completed') continue
    if (!row.completed) continue
    if (row.duration_seconds == null || row.duration_seconds <= 0) continue

    const exerciseId = row.scheduled_workout_exercises.exercise_id
    const currentBest = bestByExercise[exerciseId]
    if (currentBest == null || row.duration_seconds < currentBest) {
      bestByExercise[exerciseId] = row.duration_seconds
    }
  }

  return bestByExercise
}

function daysAgoKey(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function fetchGoalProgressContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  options?: {
    programId?: string | null
  }
): Promise<GoalProgressContext> {
  const sinceDate = daysAgoKey(365)

  const [
    scansResult,
    checkInsResult,
    nutritionLogsResult,
    prRecordsResult,
    durationLogsResult,
    workoutsResult,
    assignmentResult,
    exercisesResult,
  ] = await Promise.all([
    supabase
      .from('client_inbody_scans')
      .select('*')
      .eq('client_id', clientId)
      .order('scan_date', { ascending: false })
      .limit(50),
    supabase
      .from('client_check_ins')
      .select('*')
      .eq('client_id', clientId)
      .gte('check_in_date', sinceDate)
      .order('check_in_date', { ascending: false })
      .limit(100),
    supabase
      .from('client_nutrition_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('log_date', sinceDate)
      .order('log_date', { ascending: false })
      .limit(100),
    supabase
      .from('exercise_pr_records')
      .select('*')
      .eq('client_id', clientId)
      .order('achieved_at', { ascending: false })
      .limit(500),
    supabase
      .from('workout_log_sets')
      .select(
        `
        duration_seconds,
        completed,
        scheduled_workout_exercises!inner (exercise_id),
        client_scheduled_workouts!inner (client_id, status)
      `
      )
      .eq('client_scheduled_workouts.client_id', clientId)
      .eq('client_scheduled_workouts.status', 'completed')
      .eq('completed', true)
      .not('duration_seconds', 'is', null),
    supabase
      .from('client_scheduled_workouts')
      .select('id, status, scheduled_date, completed_at')
      .eq('client_id', clientId)
      .gte('scheduled_date', sinceDate)
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('program_assignments')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('exercises')
      .select('id, name')
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ])

  const activeAssignment = (assignmentResult.data ??
    null) as ClientProgramAssignment | null

  const programId = options?.programId ?? activeAssignment?.program_id ?? null
  let programDayOffsets: number[] = []

  if (programId) {
    const { data: programDays } = await supabase
      .from('program_scheduled_workouts')
      .select('day_offset')
      .eq('program_id', programId)

    programDayOffsets = (programDays ?? []).map((row) => row.day_offset)
  }

  return {
    scans: (scansResult.data ?? []) as ClientInbodyScan[],
    checkIns: (checkInsResult.data ?? []) as ClientCheckIn[],
    nutritionLogs: (nutritionLogsResult.data ?? []) as ClientNutritionLog[],
    prRecords: (prRecordsResult.data ?? []) as ExercisePrRecord[],
    bestDurationByExerciseId: buildBestDurationByExerciseId(
      (durationLogsResult.data ?? []) as WorkoutLogDurationRow[]
    ),
    workouts: (workoutsResult.data ?? []) as GoalProgressContext['workouts'],
    activeAssignment,
    programDayOffsets,
    exercises: (exercisesResult.data ?? []) as Pick<
      Exercise,
      'id' | 'name'
    >[],
  }
}

export function getExerciseName(
  exercises: Pick<Exercise, 'id' | 'name'>[],
  exerciseId: string | null | undefined
) {
  if (!exerciseId) return null
  return exercises.find((row) => row.id === exerciseId)?.name ?? null
}

export function parseGoalMetadata(
  metadata: ClientGoalMetadata | null | undefined
): ClientGoalMetadata {
  return metadata ?? {}
}

export type GoalProgressOptions = {
  weekStartsOn?: CoachPreferences['weekStartsOn']
  timezone?: CoachPreferences['timezone']
}
