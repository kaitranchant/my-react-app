'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  workoutFormSchema,
  workoutStatuses,
  type WorkoutFormValues,
} from '@/lib/validations/workout'
import type { WorkoutStatus } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateWorkoutResult =
  | { success: true; workoutId: string }
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

function toWorkoutRow(values: WorkoutFormValues) {
  return {
    name: values.name,
    description: values.description ? values.description : null,
    status: values.status,
  }
}

function revalidateWorkouts() {
  revalidatePath('/library/workouts')
  revalidatePath('/library')
}

export async function createWorkoutRecord(
  values: WorkoutFormValues
): Promise<CreateWorkoutResult> {
  const parsed = workoutFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('workouts')
    .insert({ ...toWorkoutRow(parsed.data), coach_id: user.id })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create workout.' }
  }

  revalidateWorkouts()
  return { success: true, workoutId: data.id }
}

export async function updateWorkoutRecord(
  id: string,
  values: WorkoutFormValues
): Promise<ActionResult> {
  const parsed = workoutFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('workouts')
    .update(toWorkoutRow(parsed.data))
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateWorkouts()
  return { success: true }
}

export async function setWorkoutStatus(
  id: string,
  status: WorkoutStatus
): Promise<ActionResult> {
  if (!workoutStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('workouts')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateWorkouts()
  return { success: true }
}

export async function deleteWorkoutRecord(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('workouts').delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateWorkouts()
  return { success: true }
}
