/**
 * Backfill exercise_pr_records from historical completed workout logs.
 * Run: yarn workspace next-app backfill:prs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in apps/next/.env.local
 */
import { createClient } from '@supabase/supabase-js'

import {
  buildHistoricalBestFromRecords,
  detectSessionPrs,
} from '../lib/load-analytics'
import { parseTrackingOptions } from '../lib/scheduled-exercise'
import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type WorkoutRow = {
  id: string
  client_id: string
  completed_at: string | null
  clients: { coach_id: string }
  exercises: {
    id: string
    exercise_id: string
    tracking_options: unknown
  }[] | null
}

async function main() {
  const { data: workouts, error } = await supabase
    .from('client_scheduled_workouts')
    .select(
      `
      id,
      client_id,
      completed_at,
      clients!inner (coach_id),
      exercises:scheduled_workout_exercises(
        id,
        exercise_id,
        tracking_options
      )
    `
    )
    .eq('status', 'completed')
    .order('completed_at', { ascending: true })

  if (error) {
    throw error
  }

  let inserted = 0

  for (const workout of (workouts ?? []) as WorkoutRow[]) {
    const achievedAt = workout.completed_at ?? new Date().toISOString()
    const coachId = workout.clients.coach_id
    const { data: logSets, error: logSetsError } = await supabase
      .from('workout_log_sets')
      .select('*')
      .eq('scheduled_workout_id', workout.id)

    if (logSetsError || !logSets?.length) continue

    for (const exercise of workout.exercises ?? []) {
      const options = parseTrackingOptions(exercise.tracking_options)
      if (options.disablePrTracking) continue

      const exerciseSets = logSets
        .filter((set) => set.scheduled_exercise_id === exercise.id)
        .map((set) => ({
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
        }))

      const { data: existingRecords } = await supabase
        .from('exercise_pr_records')
        .select('record_type, e1rm, weight, reps')
        .eq('client_id', workout.client_id)
        .eq('exercise_id', exercise.exercise_id)
        .lt('achieved_at', achievedAt)

      const historicalBest = buildHistoricalBestFromRecords(existingRecords ?? [])
      const candidates = detectSessionPrs(exerciseSets, historicalBest, options)

      for (const candidate of candidates) {
        const { error: insertError } = await supabase
          .from('exercise_pr_records')
          .insert({
            client_id: workout.client_id,
            coach_id: coachId,
            exercise_id: exercise.exercise_id,
            record_type: candidate.recordType,
            e1rm: candidate.e1rm,
            weight: candidate.weight,
            reps: candidate.reps,
            session_volume: candidate.sessionVolume,
            scheduled_workout_id: workout.id,
            scheduled_exercise_id: exercise.id,
            forced: candidate.forced,
            achieved_at: achievedAt,
          })

        if (!insertError) {
          inserted++
        }
      }
    }
  }

  console.log(`Backfill complete. Inserted ${inserted} PR record(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
