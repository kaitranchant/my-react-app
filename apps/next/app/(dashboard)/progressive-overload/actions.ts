'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { isExerciseEligibleForProgressiveLoad } from '@/lib/progressive-overload-eligibility'

export type ActionResult =
  | { success: true; updatedCount?: number }
  | { success: false; error: string }

type SuggestionActionInput = {
  clientId: string
  exerciseId: string
  sourceWorkoutId: string
  sourceScheduledExerciseId: string
  sourceSessionDate: string
  previousWeight: number
  suggestedWeight: number
}

async function requireCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' as const }
  }

  return { supabase, coachId: user.id }
}

async function verifyClientOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  clientId: string
) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (error || !client) {
    return false
  }

  return true
}

function revalidateProgressiveOverloadPaths(clientId: string) {
  revalidatePath('/progressive-overload')
  revalidatePath('/dashboard')
  revalidatePath('/load')
  revalidatePath(`/clients/${clientId}/calendar`)
}

async function applyApprovedTargetWeight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  exerciseId: string,
  targetWeight: string,
  fromDate: string
) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('progressive_overload_enabled')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) {
    return { success: false as const, error: clientError.message }
  }

  if (!client?.progressive_overload_enabled) {
    return { success: true as const, updatedCount: 0 }
  }

  const { data: upcomingWorkouts, error: workoutsError } = await supabase
    .from('client_scheduled_workouts')
    .select(
      `
      id,
      scheduled_date,
      exercises:scheduled_workout_exercises(
        id,
        exercise_id,
        tracking_options,
        weight_percent
      )
    `
    )
    .eq('client_id', clientId)
    .gte('scheduled_date', fromDate)
    .in('status', ['scheduled', 'in_progress'])

  if (workoutsError) {
    return { success: false as const, error: workoutsError.message }
  }

  const rowIds: string[] = []

  for (const workout of upcomingWorkouts ?? []) {
    for (const row of workout.exercises ?? []) {
      if (row.exercise_id !== exerciseId) continue
      if (!isExerciseEligibleForProgressiveLoad(row)) continue
      rowIds.push(row.id)
    }
  }

  if (rowIds.length === 0) {
    return { success: true as const, updatedCount: 0 }
  }

  const { error: updateError } = await supabase
    .from('scheduled_workout_exercises')
    .update({ target_weight: targetWeight })
    .in('id', rowIds)

  if (updateError) {
    return { success: false as const, error: updateError.message }
  }

  return { success: true as const, updatedCount: rowIds.length }
}

export async function approveProgressiveOverloadSuggestion(
  input: SuggestionActionInput
): Promise<ActionResult> {
  const coach = await requireCoach()
  if ('error' in coach) {
    return { success: false as const, error: coach.error ?? 'Unauthorized.' }
  }

  const ownsClient = await verifyClientOwnership(
    coach.supabase,
    coach.coachId,
    input.clientId
  )
  if (!ownsClient) {
    return { success: false, error: 'Client not found.' }
  }

  const fromDate = new Date().toISOString().slice(0, 10)
  const targetWeight = String(input.suggestedWeight)

  const applyResult = await applyApprovedTargetWeight(
    coach.supabase,
    input.clientId,
    input.exerciseId,
    targetWeight,
    fromDate
  )

  if (!applyResult.success) {
    return { success: false, error: applyResult.error }
  }

  const { error } = await coach.supabase
    .from('progressive_overload_decisions')
    .insert({
      coach_id: coach.coachId,
      client_id: input.clientId,
      exercise_id: input.exerciseId,
      source_workout_id: input.sourceWorkoutId,
      source_scheduled_exercise_id: input.sourceScheduledExerciseId,
      source_session_date: input.sourceSessionDate,
      previous_weight: input.previousWeight,
      suggested_weight: input.suggestedWeight,
      status: 'approved',
      upcoming_updated_count: applyResult.updatedCount,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateProgressiveOverloadPaths(input.clientId)
  return { success: true, updatedCount: applyResult.updatedCount }
}

export async function dismissProgressiveOverloadSuggestion(
  input: SuggestionActionInput
): Promise<ActionResult> {
  const coach = await requireCoach()
  if ('error' in coach) {
    return { success: false as const, error: coach.error ?? 'Unauthorized.' }
  }

  const ownsClient = await verifyClientOwnership(
    coach.supabase,
    coach.coachId,
    input.clientId
  )
  if (!ownsClient) {
    return { success: false, error: 'Client not found.' }
  }

  const { error } = await coach.supabase
    .from('progressive_overload_decisions')
    .insert({
      coach_id: coach.coachId,
      client_id: input.clientId,
      exercise_id: input.exerciseId,
      source_workout_id: input.sourceWorkoutId,
      source_scheduled_exercise_id: input.sourceScheduledExerciseId,
      source_session_date: input.sourceSessionDate,
      previous_weight: input.previousWeight,
      suggested_weight: input.suggestedWeight,
      status: 'dismissed',
      upcoming_updated_count: 0,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateProgressiveOverloadPaths(input.clientId)
  return { success: true }
}

export async function undoDismissProgressiveOverloadSuggestion(
  input: SuggestionActionInput
): Promise<ActionResult> {
  const coach = await requireCoach()
  if ('error' in coach) {
    return { success: false as const, error: coach.error ?? 'Unauthorized.' }
  }

  const ownsClient = await verifyClientOwnership(
    coach.supabase,
    coach.coachId,
    input.clientId
  )
  if (!ownsClient) {
    return { success: false, error: 'Client not found.' }
  }

  const { error } = await coach.supabase
    .from('progressive_overload_decisions')
    .delete()
    .eq('coach_id', coach.coachId)
    .eq('source_scheduled_exercise_id', input.sourceScheduledExerciseId)
    .eq('status', 'dismissed')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateProgressiveOverloadPaths(input.clientId)
  return { success: true }
}

export async function approveAllProgressiveOverloadSuggestions(
  suggestions: SuggestionActionInput[]
): Promise<ActionResult> {
  let updatedTotal = 0

  for (const suggestion of suggestions) {
    const result = await approveProgressiveOverloadSuggestion(suggestion)
    if (!result.success) {
      return result
    }
    updatedTotal += result.updatedCount ?? 0
  }

  return { success: true, updatedCount: updatedTotal }
}
