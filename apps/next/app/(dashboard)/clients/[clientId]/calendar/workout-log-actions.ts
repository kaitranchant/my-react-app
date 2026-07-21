'use server'

import { revalidatePath } from 'next/cache'

import {
  evaluateAndPersistWorkoutPrs,
  fetchPersonalBestsByExerciseIds,
  type CompleteWorkoutResult,
} from '@/lib/pr-records'
import {
  attachSignedUrlsToFormReviews,
  formReviewStoragePath,
  FORM_REVIEWS_BUCKET,
  getFormReviewMaxUploadBytes,
  resolveFormReviewContentType,
} from '@/lib/form-reviews'
import {
  fetchExerciseHistory,
  fetchLogSets,
  fetchPreviousSetsForExercises,
  fetchWorkoutWithExercises,
} from '@/lib/scheduled-workout-queries'
import {
  exerciseLogNotesSchema,
  saveWorkoutLogSetsSchema,
  type WorkoutLogSetValues,
} from '@/lib/validations/workout-log'
import {
  formReviewUploadSchema,
  type FormReviewUploadValues,
} from '@/lib/validations/form-review'
import { syncWorkoutLogSetsForExercises } from '@/lib/workout-log-set-sync'
import { createClient } from '@/lib/supabase/server'
import { requireClientAccess } from '@/lib/gym-access'
import type {
  ClientFormReview,
  ClientFormReviewWithUrl,
  WorkoutLogData,
  WorkoutLogSet,
} from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type WorkoutLogResult =
  | { success: true; data: WorkoutLogData }
  | { success: false; error: string }

export type CoachFormReviewUploadResult =
  | { success: true; data: ClientFormReviewWithUrl }
  | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

async function requireClient(clientId: string) {
  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return null
  }

  return {
    supabase: ctx.supabase,
    user: ctx.user,
    client: {
      id: ctx.client.id,
      coach_id: ctx.client.coach_id,
      progressive_overload_enabled: ctx.client.progressive_overload_enabled,
    },
  }
}

function revalidateClientCalendar(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
}

export async function getWorkoutLogData(
  clientId: string,
  workoutId: string
): Promise<WorkoutLogResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  const { logSets, error: logSetsError } = await fetchLogSets(supabase, workoutId)
  if (logSetsError) {
    return { success: false, error: logSetsError }
  }

  const libraryExerciseIds = Array.from(
    new Set(workout.exercises.map((row) => row.exercise_id))
  )
  const [
    {
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      previousSessionCoachNotesByExerciseId,
    },
    personalBestsByExerciseId,
  ] = await Promise.all([
    fetchPreviousSetsForExercises(
      supabase,
      clientId,
      workoutId,
      libraryExerciseIds
    ),
    fetchPersonalBestsByExerciseIds(supabase, clientId, libraryExerciseIds),
  ])

  return {
    success: true,
    data: {
      ...workout,
      logSets,
      previousSetsByExerciseId,
      previousSessionDateByExerciseId,
      previousSessionCoachNotesByExerciseId,
      personalBestsByExerciseId,
      progressiveOverloadEnabled: ctx.client.progressive_overload_enabled ?? false,
    },
  }
}

export async function uploadCoachFormReview(
  clientId: string,
  values: FormReviewUploadValues,
  formData: FormData
): Promise<CoachFormReviewUploadResult> {
  const parsed = formReviewUploadSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No file provided.' }
  }

  const contentType = resolveFormReviewContentType(file)
  if (!contentType) {
    return {
      success: false,
      error: 'Unsupported file type. Use MP4, WebM, MOV, JPEG, PNG, or WebP.',
    }
  }

  const maxUploadBytes = getFormReviewMaxUploadBytes(contentType)
  if (file.size > maxUploadBytes) {
    return {
      success: false,
      error: contentType.startsWith('image/')
        ? 'Photos must be under 10 MB.'
        : 'Videos must be under 50 MB.',
    }
  }

  const { exerciseId, scheduledWorkoutId, scheduledExerciseId } = parsed.data
  if (!exerciseId || !scheduledWorkoutId || !scheduledExerciseId) {
    return { success: false, error: 'Workout exercise details are required.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, client } = ctx
  const { data: scheduledExercise } = await supabase
    .from('scheduled_workout_exercises')
    .select(
      'id, exercise_id, scheduled_workout_id, scheduled_workout:client_scheduled_workouts!inner(client_id)'
    )
    .eq('id', scheduledExerciseId)
    .maybeSingle()

  const workout = Array.isArray(scheduledExercise?.scheduled_workout)
    ? scheduledExercise.scheduled_workout[0]
    : scheduledExercise?.scheduled_workout

  if (
    !scheduledExercise ||
    workout?.client_id !== clientId ||
    scheduledExercise.exercise_id !== exerciseId ||
    scheduledExercise.scheduled_workout_id !== scheduledWorkoutId
  ) {
    return { success: false, error: 'Exercise not found in this workout.' }
  }

  const reviewId = crypto.randomUUID()
  const storagePath = formReviewStoragePath(clientId, reviewId, contentType)
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(FORM_REVIEWS_BUCKET)
    .upload(storagePath, buffer, {
      upsert: false,
      contentType,
      cacheControl: '3600',
    })

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  const { data: review, error: insertError } = await supabase
    .from('client_form_reviews')
    .insert({
      id: reviewId,
      client_id: clientId,
      coach_id: client.coach_id,
      exercise_id: exerciseId,
      storage_path: storagePath,
      content_type: contentType,
      file_size_bytes: file.size,
      title: parsed.data.title,
      client_notes: null,
      scheduled_workout_id: scheduledWorkoutId,
      scheduled_exercise_id: scheduledExerciseId,
      uploaded_by: 'coach',
    })
    .select('*')
    .single()

  if (insertError || !review) {
    await supabase.storage.from(FORM_REVIEWS_BUCKET).remove([storagePath])
    return {
      success: false,
      error: insertError?.message ?? 'Unable to save form review media.',
    }
  }

  const [reviewWithUrl] = await attachSignedUrlsToFormReviews(supabase, [
    review as ClientFormReview,
  ])
  revalidateClientCalendar(clientId)
  revalidatePath(`/clients/${clientId}/workouts/${scheduledWorkoutId}/log`)
  revalidatePath('/form-review')
  revalidatePath('/portal/form-review')
  return { success: true, data: reviewWithUrl }
}

export async function deleteCoachWorkoutFormReview(
  clientId: string,
  reviewId: string,
  scheduledWorkoutId: string,
  scheduledExerciseId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const { data: review, error: fetchError } = await supabase
    .from('client_form_reviews')
    .select('id, storage_path')
    .eq('id', reviewId)
    .eq('client_id', clientId)
    .eq('scheduled_workout_id', scheduledWorkoutId)
    .eq('scheduled_exercise_id', scheduledExerciseId)
    .eq('uploaded_by', 'coach')
    .maybeSingle()

  if (fetchError || !review) {
    return { success: false, error: 'Form review media not found.' }
  }

  const { error: storageError } = await supabase.storage
    .from(FORM_REVIEWS_BUCKET)
    .remove([review.storage_path])

  if (storageError) {
    return { success: false, error: storageError.message }
  }

  const { error: deleteError } = await supabase
    .from('client_form_reviews')
    .delete()
    .eq('id', review.id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  revalidateClientCalendar(clientId)
  revalidatePath(`/clients/${clientId}/workouts/${scheduledWorkoutId}/log`)
  revalidatePath('/form-review')
  revalidatePath('/portal/form-review')
  return { success: true }
}

export async function startWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status === 'completed' || workout.status === 'skipped') {
    return { success: false, error: 'This workout is already finished.' }
  }

  if (workout.status === 'in_progress') {
    const { error } = await supabase
      .from('client_scheduled_workouts')
      .update({ status: 'scheduled' })
      .eq('id', workoutId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidateClientCalendar(clientId)
  }

  return { success: true }
}

export async function stopWorkoutLog(
  clientId: string,
  workoutId: string,
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const { data: workout, error: workoutError } = await supabase
    .from('client_scheduled_workouts')
    .select('id, status, completed_at')
    .eq('id', workoutId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (workoutError || !workout) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status === 'in_progress' && !workout.completed_at) {
    const { error } = await supabase
      .from('client_scheduled_workouts')
      .update({ status: 'scheduled' })
      .eq('id', workoutId)

    if (error) {
      return { success: false, error: error.message }
    }

    if (options?.revalidate !== false) {
      revalidateClientCalendar(clientId)
    }
  }

  return { success: true }
}

export async function saveWorkoutLogSets(
  clientId: string,
  workoutId: string,
  sets: WorkoutLogSetValues[],
  options?: {
    revalidate?: boolean
    syncSetDeletions?: boolean
  }
): Promise<ActionResult> {
  const parsed = saveWorkoutLogSetsSchema.safeParse({
    workoutId,
    sets,
  })
  if (!parsed.success) {
    return { success: false, error: 'Invalid workout log data.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status === 'completed' || workout.status === 'skipped') {
    return { success: true }
  }

  const exerciseIds = new Set(workout.exercises.map((row) => row.id))
  for (const set of parsed.data.sets) {
    if (!exerciseIds.has(set.scheduledExerciseId)) {
      return { success: false, error: 'Exercise not found in this workout.' }
    }
  }

  const rows = parsed.data.sets.map((set) => ({
    scheduled_workout_id: workoutId,
    scheduled_exercise_id: set.scheduledExerciseId,
    set_number: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    duration_seconds: set.durationSeconds,
    distance_meters: set.distanceMeters,
    bar_speed: set.barSpeed,
    peak_power: set.peakPower,
    rpe: set.rpe,
    completed: set.completed,
    notes: set.notes,
  }))

  if (rows.length > 0) {
    const { error } = await supabase.from('workout_log_sets').upsert(rows, {
      onConflict: 'scheduled_exercise_id,set_number',
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  if (options?.syncSetDeletions) {
    const syncResult = await syncWorkoutLogSetsForExercises(
      supabase,
      workoutId,
      parsed.data.sets,
      exerciseIds
    )
    if (!syncResult.success) {
      return syncResult
    }
  }

  if (options?.revalidate !== false) {
    revalidateClientCalendar(clientId)
  }
  return { success: true }
}

export async function completeWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<CompleteWorkoutResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status === 'completed') {
    return { success: true, newPrs: [] }
  }

  const achievedAt = new Date().toISOString()
  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: 'completed',
      completed_at: achievedAt,
      started_at: workout.started_at ?? achievedAt,
    })
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true, newPrs: [] }
}

export async function persistWorkoutLogPrs(
  clientId: string,
  workoutId: string
): Promise<CompleteWorkoutResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status !== 'completed') {
    return { success: false, error: 'Workout is not completed.' }
  }

  const achievedAt = workout.completed_at ?? new Date().toISOString()
  const { logSets } = await fetchLogSets(supabase, workoutId)
  const newPrs = await evaluateAndPersistWorkoutPrs(supabase, {
    clientId,
    coachId: user.id,
    workout,
    logSets,
    achievedAt,
  })

  revalidatePath(`/clients/${clientId}`)
  return { success: true, newPrs }
}

export async function skipWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
    })
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export async function updateScheduledExerciseCoachNotes(
  clientId: string,
  exerciseRowId: string,
  notes: string,
  options?: { revalidate?: boolean }
): Promise<ActionResult> {
  const parsed = exerciseLogNotesSchema.safeParse({ notes })
  if (!parsed.success) {
    return { success: false, error: 'Notes must be 500 characters or fewer.' }
  }

  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx

  const { data: row, error: rowError } = await supabase
    .from('scheduled_workout_exercises')
    .select('id, scheduled_workout:client_scheduled_workouts!inner(client_id)')
    .eq('id', exerciseRowId)
    .maybeSingle()

  if (rowError || !row) {
    return { success: false, error: 'Exercise not found.' }
  }

  const workout = row.scheduled_workout as { client_id: string }
  if (workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  const trimmed = parsed.data.notes
  const { error } = await supabase
    .from('scheduled_workout_exercises')
    .update({ coach_session_notes: trimmed ? trimmed : null })
    .eq('id', exerciseRowId)

  if (error) {
    return { success: false, error: error.message }
  }

  if (options?.revalidate !== false) {
    revalidateClientCalendar(clientId)
  }
  return { success: true }
}

export async function reopenWorkoutLog(
  clientId: string,
  workoutId: string
): Promise<ActionResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase } = ctx
  const workout = await fetchWorkoutWithExercises(supabase, workoutId)
  if (!workout || workout.client_id !== clientId) {
    return { success: false, error: 'Workout not found.' }
  }

  if (workout.status !== 'completed' && workout.status !== 'skipped') {
    return { success: false, error: 'Only finished workouts can be reopened.' }
  }

  const hasLoggedSets = (await fetchLogSets(supabase, workoutId)).logSets.length > 0
  const nextStatus = 'scheduled'

  const { error } = await supabase
    .from('client_scheduled_workouts')
    .update({
      status: nextStatus,
      completed_at: null,
      ...(hasLoggedSets || workout.started_at
        ? {}
        : { started_at: null }),
    })
    .eq('id', workoutId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClientCalendar(clientId)
  return { success: true }
}

export type ExerciseHistoryResult =
  | { success: true; sessions: import('app/types/database').ExerciseHistorySession[] }
  | { success: false; error: string }

export async function getExerciseHistory(
  clientId: string,
  exerciseId: string,
  options?: { excludeWorkoutId?: string; limit?: number }
): Promise<ExerciseHistoryResult> {
  const ctx = await requireClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const sessions = await fetchExerciseHistory(
    ctx.supabase,
    clientId,
    exerciseId,
    options
  )

  return { success: true, sessions }
}
