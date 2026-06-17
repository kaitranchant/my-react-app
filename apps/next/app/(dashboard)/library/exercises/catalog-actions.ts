'use server'

import { revalidatePath } from 'next/cache'

import {
  ExerciseDbError,
  fetchExerciseDbById,
  fetchExerciseDbLists,
  isExerciseDbConfigured,
  mapExerciseDbToRow,
  searchExerciseDb,
  type ExerciseDbExercise,
} from '@/lib/exercisedb'
import { createClient } from '@/lib/supabase/server'

export type CatalogActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export type ImportExerciseResult =
  | { success: true; exerciseId: string }
  | { success: false; error: string; alreadyImported?: boolean }

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

function revalidateExercises(clientId?: string) {
  revalidatePath('/library/exercises')
  revalidatePath('/library')
  if (clientId) {
    revalidatePath(`/clients/${clientId}`)
  }
}

function toErrorMessage(error: unknown) {
  if (error instanceof ExerciseDbError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export async function getExerciseCatalogConfig(): Promise<
  CatalogActionResult<{
    configured: boolean
    bodyParts: string[]
    equipment: string[]
    targets: string[]
  }>
> {
  if (!isExerciseDbConfigured()) {
    return {
      success: true,
      data: {
        configured: false,
        bodyParts: [],
        equipment: [],
        targets: [],
      },
    }
  }

  try {
    const lists = await fetchExerciseDbLists()
    return {
      success: true,
      data: {
        configured: true,
        ...lists,
      },
    }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function searchExerciseCatalog(params: {
  query?: string
  bodyPart?: string
  equipment?: string
  target?: string
  offset?: number
}): Promise<
  CatalogActionResult<{
    exercises: ExerciseDbExercise[]
    offset: number
    hasMore: boolean
  }>
> {
  if (!isExerciseDbConfigured()) {
    return {
      success: false,
      error:
        'ExerciseDB is not configured. Add EXERCISEDB_RAPIDAPI_KEY to apps/next/.env.local.',
    }
  }

  try {
    const result = await searchExerciseDb(params)
    return {
      success: true,
      data: {
        exercises: result.exercises,
        offset: result.offset,
        hasMore: result.hasMore,
      },
    }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function importExerciseFromCatalog(
  externalId: string
): Promise<ImportExerciseResult> {
  if (!externalId.trim()) {
    return { success: false, error: 'Invalid exercise.' }
  }

  if (!isExerciseDbConfigured()) {
    return {
      success: false,
      error:
        'ExerciseDB is not configured. Add EXERCISEDB_RAPIDAPI_KEY to apps/next/.env.local.',
    }
  }

  const { supabase, user } = await requireUser()

  const { data: existing } = await supabase
    .from('exercises')
    .select('id')
    .eq('coach_id', user.id)
    .eq('external_id', externalId)
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: 'This exercise is already in your library.',
      alreadyImported: true,
    }
  }

  try {
    const remote = await fetchExerciseDbById(externalId)
    const row = mapExerciseDbToRow(remote)

    const { data, error } = await supabase
      .from('exercises')
      .insert({ ...row, coach_id: user.id })
      .select('id')
      .single()

    if (error || !data) {
      if (error?.code === '23505') {
        return {
          success: false,
          error: 'This exercise is already in your library.',
          alreadyImported: true,
        }
      }
      return {
        success: false,
        error: error?.message ?? 'Could not import exercise.',
      }
    }

    revalidateExercises()
    return { success: true, exerciseId: data.id }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function ensureCatalogExercise(
  externalId: string,
  clientId?: string
): Promise<ImportExerciseResult> {
  if (!externalId.trim()) {
    return { success: false, error: 'Invalid exercise.' }
  }

  if (!isExerciseDbConfigured()) {
    return {
      success: false,
      error:
        'ExerciseDB is not configured. Add EXERCISEDB_RAPIDAPI_KEY to apps/next/.env.local.',
    }
  }

  const { supabase, user } = await requireUser()

  const { data: existing } = await supabase
    .from('exercises')
    .select('id')
    .eq('coach_id', user.id)
    .eq('external_id', externalId)
    .maybeSingle()

  if (existing) {
    return { success: true, exerciseId: existing.id }
  }

  try {
    const remote = await fetchExerciseDbById(externalId)
    const row = mapExerciseDbToRow(remote)

    const { data, error } = await supabase
      .from('exercises')
      .insert({ ...row, coach_id: user.id })
      .select('id')
      .single()

    if (error || !data) {
      if (error?.code === '23505') {
        const { data: raced } = await supabase
          .from('exercises')
          .select('id')
          .eq('coach_id', user.id)
          .eq('external_id', externalId)
          .maybeSingle()

        if (raced) {
          return { success: true, exerciseId: raced.id }
        }
      }
      return {
        success: false,
        error: error?.message ?? 'Could not import exercise.',
      }
    }

    revalidateExercises(clientId)
    return { success: true, exerciseId: data.id }
  } catch (error) {
    return { success: false, error: toErrorMessage(error) }
  }
}
