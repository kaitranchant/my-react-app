'use server'

import { revalidatePath } from 'next/cache'

import {
  attachSignedUrlsToFormReviews,
  FORM_REVIEWS_BUCKET,
} from '@/lib/form-reviews'
import { requireClientAccess } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'
import { notifyClientOfFormReviewReply } from '@/lib/notifications/notify-client-form-review-reply'
import {
  formReviewFeedbackSchema,
  type FormReviewFeedbackValues,
} from '@/lib/validations/form-review'
import type {
  ClientFormReview,
  ClientFormReviewWithClient,
} from 'app/types/database'

type ActionResult = { success: true } | { success: false; error: string }

function revalidateFormReviewPaths(clientId: string) {
  revalidatePath('/form-review')
  revalidatePath('/dashboard')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal/form-review')
  revalidatePath('/portal', 'layout')
}

export async function updateFormReviewFeedback(
  reviewId: string,
  values: FormReviewFeedbackValues
): Promise<ActionResult> {
  const parsed = formReviewFeedbackSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('client_form_reviews')
    .select('id, client_id, title')
    .eq('id', reviewId)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Submission not found.' }
  }

  const clientAccess = await requireClientAccess(existing.client_id)
  if (!clientAccess) {
    return { success: false, error: 'Submission not found.' }
  }

  const { data: reviewRows, error } = await supabase.rpc(
    'review_client_form_review',
    {
      p_review_id: reviewId,
      p_coach_feedback: parsed.data.coachFeedback,
      p_coach_annotations: parsed.data.coachAnnotations,
    }
  )

  const reviewed = reviewRows?.[0]
  if (error || !reviewed) {
    return {
      success: false,
      error: error?.message ?? 'Unable to save form review feedback.',
    }
  }

  if (!reviewed.was_previously_reviewed) {
    void notifyClientOfFormReviewReply({
      clientId: reviewed.client_id,
      coachId: user.id,
      reviewTitle: reviewed.review_title?.trim() || 'Form review',
      coachFeedback: parsed.data.coachFeedback,
    })
  }

  revalidateFormReviewPaths(reviewed.client_id)
  return { success: true }
}

export async function deleteCoachFormReview(
  reviewId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: review, error: fetchError } = await supabase
    .from('client_form_reviews')
    .select('id, client_id, coach_id, storage_path')
    .eq('id', reviewId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!review) {
    return { success: false, error: 'Submission not found.' }
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

  revalidateFormReviewPaths(review.client_id)
  return { success: true }
}

export async function fetchCoachFormReviews(
  limit = 50
): Promise<ClientFormReviewWithClient[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('client_form_reviews')
    .select(
      '*, client:clients(id, full_name, avatar_url, email), exercise:exercises(id, name)'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  const reviews = data.map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client
    const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
    return {
      ...(row as Omit<
        ClientFormReviewWithClient,
        'signedUrl' | 'client' | 'exercise' | 'canDelete'
      >),
      client: client ?? null,
      exercise: exercise ?? null,
      canDelete: row.coach_id === user?.id,
    }
  })

  const withUrls = await attachSignedUrlsToFormReviews(supabase, reviews)

  return withUrls.map((review, index) => ({
    ...review,
    client: reviews[index]?.client ?? null,
    exercise: reviews[index]?.exercise ?? null,
    canDelete: reviews[index]?.canDelete ?? false,
  }))
}

export async function fetchClientFormReviews(
  clientId: string,
  limit = 50
): Promise<ClientFormReviewWithClient[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('client_form_reviews')
    .select(
      '*, client:clients(id, full_name, avatar_url, email), exercise:exercises(id, name)'
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  const reviews = data.map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client
    const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
    return {
      ...(row as Omit<
        ClientFormReviewWithClient,
        'signedUrl' | 'client' | 'exercise' | 'canDelete'
      >),
      client: client ?? null,
      exercise: exercise ?? null,
      canDelete: row.coach_id === user?.id,
    }
  })

  const withUrls = await attachSignedUrlsToFormReviews(supabase, reviews)

  return withUrls.map((review, index) => ({
    ...review,
    client: reviews[index]?.client ?? null,
    exercise: reviews[index]?.exercise ?? null,
    canDelete: reviews[index]?.canDelete ?? false,
  }))
}
