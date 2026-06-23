import { sendFormReviewNotificationEmail } from '@/lib/email/form-review-notification'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ClientFormReview } from 'app/types/database'

export async function notifyCoachOfFormReviewSubmission(params: {
  coachId: string
  clientId: string
  clientName: string
  review: Pick<
    ClientFormReview,
    | 'title'
    | 'content_type'
    | 'client_notes'
    | 'scheduled_workout_id'
    | 'exercise_id'
  >
}): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    return
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('notify_form_reviews, full_name')
    .eq('id', params.coachId)
    .maybeSingle()

  if (!profile?.notify_form_reviews) {
    return
  }

  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(params.coachId)

  const coachEmail = authUser?.user?.email?.trim()
  if (authError || !coachEmail) {
    return
  }

  let exercise: { name: string } | null = null
  if (params.review.exercise_id) {
    const { data: exerciseRow } = await admin
      .from('exercises')
      .select('name')
      .eq('id', params.review.exercise_id)
      .maybeSingle()

    exercise = exerciseRow?.name ? { name: exerciseRow.name } : null
  }

  let workoutName: string | null = null
  if (params.review.scheduled_workout_id) {
    const { data: workout } = await admin
      .from('client_scheduled_workouts')
      .select('name')
      .eq('id', params.review.scheduled_workout_id)
      .eq('client_id', params.clientId)
      .maybeSingle()

    workoutName = workout?.name?.trim() || null
  }

  await sendFormReviewNotificationEmail({
    coachName: profile.full_name?.trim() || 'Coach',
    coachEmail,
    clientName: params.clientName,
    clientId: params.clientId,
    review: {
      title: params.review.title,
      content_type: params.review.content_type,
      client_notes: params.review.client_notes,
      scheduled_workout_id: params.review.scheduled_workout_id,
      exercise,
    },
    workoutName,
  })
}
