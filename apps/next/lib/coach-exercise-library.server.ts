import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  getCatalogExerciseCount,
  getCatalogSeedRows,
  isExerciseDbConfigured,
} from '@/lib/exercise-catalog.server'

const INSERT_CHUNK = 50

export async function ensureCoachCatalogSeeded(
  supabase: SupabaseClient,
  coachId: string
) {
  if (!isExerciseDbConfigured()) return

  const catalogSize = getCatalogExerciseCount()

  const { count, error: countError } = await supabase
    .from('exercises')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('source', 'exercisedb')

  if (countError) {
    throw new Error(countError.message)
  }

  if ((count ?? 0) >= catalogSize) return

  const { data: existing, error: existingError } = await supabase
    .from('exercises')
    .select('external_id')
    .eq('coach_id', coachId)
    .eq('source', 'exercisedb')

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingIds = new Set(
    (existing ?? [])
      .map((row) => row.external_id)
      .filter((id): id is string => Boolean(id))
  )

  const missing = getCatalogSeedRows().filter(
    (row) => row.external_id && !existingIds.has(row.external_id)
  )

  if (missing.length === 0) return

  for (let index = 0; index < missing.length; index += INSERT_CHUNK) {
    const chunk = missing.slice(index, index + INSERT_CHUNK).map((row) => ({
      ...row,
      coach_id: coachId,
    }))

    const { error } = await supabase.from('exercises').insert(chunk)
    if (error && error.code !== '23505') {
      throw new Error(error.message)
    }
  }
}
