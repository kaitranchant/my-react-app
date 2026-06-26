'use server'

import { revalidatePath } from 'next/cache'

import {
  attachSignedUrlsToFormReviews,
  formReviewStoragePath,
  FORM_REVIEWS_BUCKET,
  getFormReviewMaxUploadBytes,
  resolveFormReviewContentType,
} from '@/lib/form-reviews'
import { notifyCoachOfFormReviewSubmission } from '@/lib/notifications/notify-coach-form-reviews'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import {
  formReviewUploadSchema,
  type FormReviewUploadValues,
} from '@/lib/validations/form-review'
import type {
  ClientFormReview,
  ClientFormReviewWithUrl,
} from 'app/types/database'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export type FormReviewUploadResult = ActionResult<ClientFormReviewWithUrl>

async function revalidateFormReviewPaths(clientId: string) {
  revalidatePath('/portal/form-review')
  revalidatePath('/portal/workouts')
  revalidatePath('/portal', 'layout')
  revalidatePath('/form-review')
  revalidatePath(`/clients/${clientId}`)
}

async function validateWorkoutContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  scheduledWorkoutId: string | null,
  scheduledExerciseId: string | null
): Promise<string | null> {
  if (!scheduledWorkoutId && !scheduledExerciseId) {
    return null
  }

  if (scheduledWorkoutId) {
    const { data: workout } = await supabase
      .from('client_scheduled_workouts')
      .select('id')
      .eq('id', scheduledWorkoutId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!workout) {
      return 'Workout not found.'
    }
  }

  if (scheduledExerciseId) {
    const { data: scheduledExercise } = await supabase
      .from('scheduled_workout_exercises')
      .select('id, scheduled_workout_id, scheduled_workout:client_scheduled_workouts(client_id)')
      .eq('id', scheduledExerciseId)
      .maybeSingle()

    const workout = Array.isArray(scheduledExercise?.scheduled_workout)
      ? scheduledExercise.scheduled_workout[0]
      : scheduledExercise?.scheduled_workout

    if (
      !scheduledExercise ||
      workout?.client_id !== clientId ||
      (scheduledWorkoutId &&
        scheduledExercise.scheduled_workout_id !== scheduledWorkoutId)
    ) {
      return 'Exercise not found in this workout.'
    }
  }

  return null
}

export async function uploadClientFormReview(
  values: FormReviewUploadValues,
  formData: FormData
): Promise<FormReviewUploadResult> {
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const portalCtx = await getPortalClientContext()
  const client = portalCtx?.client

  if (!client) {
    return { success: false, error: 'Client profile not found.' }
  }

  if (parsed.data.exerciseId) {
    const { data: exercise } = await supabase
      .from('exercises')
      .select('id')
      .eq('id', parsed.data.exerciseId)
      .eq('coach_id', client.coach_id)
      .maybeSingle()

    if (!exercise) {
      return { success: false, error: 'Exercise not found.' }
    }
  }

  const workoutContextError = await validateWorkoutContext(
    supabase,
    client.id,
    parsed.data.scheduledWorkoutId,
    parsed.data.scheduledExerciseId
  )
  if (workoutContextError) {
    return { success: false, error: workoutContextError }
  }

  const reviewId = crypto.randomUUID()
  const storagePath = formReviewStoragePath(
    client.id,
    reviewId,
    contentType
  )
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(FORM_REVIEWS_BUCKET)
    .upload(storagePath, buffer, {
      upsert: false,
      contentType,
      cacheControl: '3600',
    })

  if (uploadError) {
    const message = uploadError.message.toLowerCase()
    if (message.includes('bucket')) {
      return {
        success: false,
        error:
          'Form review storage is not set up. Run yarn db:push or apply-client-form-reviews.sql.',
      }
    }
    return { success: false, error: uploadError.message }
  }

  const { data, error } = await supabase
    .from('client_form_reviews')
    .insert({
      id: reviewId,
      client_id: client.id,
      coach_id: client.coach_id,
      exercise_id: parsed.data.exerciseId,
      storage_path: storagePath,
      content_type: contentType,
      file_size_bytes: file.size,
      title: parsed.data.title,
      client_notes: parsed.data.clientNotes,
      scheduled_workout_id: parsed.data.scheduledWorkoutId,
      scheduled_exercise_id: parsed.data.scheduledExerciseId,
      uploaded_by: 'client',
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(FORM_REVIEWS_BUCKET).remove([storagePath])
    return { success: false, error: error.message }
  }

  const [withUrl] = await attachSignedUrlsToFormReviews(supabase, [
    data as ClientFormReview,
  ])
  await revalidateFormReviewPaths(client.id)

  void notifyCoachOfFormReviewSubmission({
    coachId: client.coach_id,
    clientId: client.id,
    clientName: client.full_name?.trim() || 'Client',
    review: {
      title: data.title,
      content_type: data.content_type,
      client_notes: data.client_notes,
      scheduled_workout_id: data.scheduled_workout_id,
      exercise_id: data.exercise_id,
    },
  }).catch(() => undefined)

  return { success: true, data: withUrl }
}

export async function deleteClientFormReview(
  reviewId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const portalCtx = await getPortalClientContext()
  const client = portalCtx?.client

  if (!client) {
    return { success: false, error: 'Client profile not found.' }
  }

  const { data: review, error: fetchError } = await supabase
    .from('client_form_reviews')
    .select('id, client_id, storage_path, reviewed_at')
    .eq('id', reviewId)
    .eq('client_id', client.id)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!review) {
    return { success: false, error: 'Submission not found.' }
  }

  if (review.reviewed_at) {
    return {
      success: false,
      error: 'This submission has been reviewed and cannot be removed.',
    }
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
    .eq('id', reviewId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  await revalidateFormReviewPaths(client.id)
  return { success: true }
}

export async function listClientFormReviews(): Promise<ClientFormReviewWithUrl[]> {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const client = portalCtx?.client

  if (!client) {
    return []
  }

  const { data, error } = await supabase
    .from('client_form_reviews')
    .select('*, exercise:exercises(id, name)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) {
    return []
  }

  const reviews = data.map((row) => {
    const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
    return {
      ...(row as Omit<ClientFormReview, 'exercise'>),
      exercise: exercise ?? null,
    }
  })

  return attachSignedUrlsToFormReviews(supabase, reviews)
}

export async function markClientFormReviewsAsViewed(): Promise<void> {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const client = portalCtx?.client

  if (!client) {
    return
  }

  const now = new Date().toISOString()

  await supabase
    .from('client_form_reviews')
    .update({ client_viewed_at: now })
    .eq('client_id', client.id)
    .not('reviewed_at', 'is', null)
    .is('client_viewed_at', null)

  revalidatePath('/portal', 'layout')
  revalidatePath('/portal/form-review')
}
