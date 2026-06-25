'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  exerciseFormSchema,
  exerciseStatuses,
  type ExerciseFormValues,
} from '@/lib/validations/exercise'
import type { Exercise, ExerciseStatus } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateExerciseResult =
  | { success: true; exerciseId: string }
  | { success: false; error: string }

export type GetExerciseResult =
  | { success: true; exercise: Exercise }
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

function toExerciseRow(values: ExerciseFormValues) {
  return {
    name: values.name,
    instructions: values.instructions ? values.instructions : null,
    muscle_group: values.muscleGroup ? values.muscleGroup : null,
    equipment: values.equipment ? values.equipment : null,
    status: values.status,
    source: 'custom' as const,
  }
}

function revalidateExercises(clientId?: string) {
  revalidatePath('/library/exercises')
  revalidatePath('/library')
  if (clientId) {
    revalidatePath(`/clients/${clientId}`)
  }
}

export async function createExerciseRecord(
  values: ExerciseFormValues,
  options?: { clientId?: string }
): Promise<CreateExerciseResult> {
  const parsed = exerciseFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('exercises')
    .insert({ ...toExerciseRow(parsed.data), coach_id: user.id })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create exercise.' }
  }

  revalidateExercises(options?.clientId)
  return { success: true, exerciseId: data.id }
}

export async function updateExerciseRecord(
  id: string,
  values: ExerciseFormValues
): Promise<ActionResult> {
  const parsed = exerciseFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('exercises')
    .update(toExerciseRow(parsed.data))
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateExercises()
  return { success: true }
}

export async function setExerciseStatus(
  id: string,
  status: ExerciseStatus
): Promise<ActionResult> {
  if (!exerciseStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('exercises')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateExercises()
  return { success: true }
}

export async function getExerciseRecord(id: string): Promise<GetExerciseResult> {
  if (!id.trim()) {
    return { success: false, error: 'Invalid exercise.' }
  }

  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'Exercise not found.',
    }
  }

  return { success: true, exercise: data as Exercise }
}

export async function deleteExerciseRecord(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('exercises').delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateExercises()
  return { success: true }
}
