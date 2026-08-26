import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import {
  type GlobalSearchIndex,
  type GlobalSearchResult,
} from '@/lib/global-search'
import { rankBySearch, simpleIlikeContains } from '@/lib/text-search'
import type { Database } from 'app/types/database'

const INDEX_CLIENT_LIMIT = 2000
const INDEX_LIBRARY_LIMIT = 500
const EXERCISE_CANDIDATE_LIMIT = 40
const EXERCISE_RESULT_LIMIT = 8

type ServerSupabase = SupabaseClient<Database>

async function loadCoachGymIds(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase
    .from('gym_members')
    .select('gym_id')
    .eq('coach_id', userId)
    .eq('status', 'active')

  return (data ?? []).map((row) => row.gym_id)
}

function scopedClientQuery(supabase: ServerSupabase, userId: string, gymIds: string[]) {
  const query = supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('is_coach_self', false)
    .limit(INDEX_CLIENT_LIMIT)

  if (gymIds.length === 0) {
    return query.eq('coach_id', userId)
  }

  return query.or(`coach_id.eq.${userId},gym_id.in.(${gymIds.join(',')})`)
}

export async function loadGlobalSearchIndex(
  supabase: ServerSupabase,
  userId: string
): Promise<GlobalSearchIndex> {
  const gymIds = await loadCoachGymIds(supabase, userId)

  const [clientsRes, workoutsRes, programsRes, mealPlansRes] = await Promise.all([
    scopedClientQuery(supabase, userId, gymIds),
    supabase
      .from('workouts')
      .select('id, name, description')
      .eq('coach_id', userId)
      .limit(INDEX_LIBRARY_LIMIT),
    supabase
      .from('programs')
      .select('id, name, description')
      .eq('coach_id', userId)
      .limit(INDEX_LIBRARY_LIMIT),
    supabase
      .from('meal_plans')
      .select('id, name, description')
      .eq('coach_id', userId)
      .is('client_id', null)
      .limit(INDEX_LIBRARY_LIMIT),
  ])

  return {
    clients: clientsRes.data ?? [],
    workouts: workoutsRes.data ?? [],
    programs: programsRes.data ?? [],
    mealPlans: mealPlansRes.data ?? [],
  }
}

export async function searchCoachExercises(
  supabase: ServerSupabase,
  userId: string,
  query: string
): Promise<GlobalSearchResult[]> {
  const pattern = simpleIlikeContains(query)
  if (!pattern) return []

  const { data } = await supabase
    .from('exercises')
    .select('id, name, muscle_group')
    .eq('coach_id', userId)
    .ilike('name', pattern)
    .limit(EXERCISE_CANDIDATE_LIMIT)

  return rankBySearch(
    data ?? [],
    query,
    (exercise) => [exercise.name, exercise.muscle_group ?? ''],
    EXERCISE_RESULT_LIMIT
  ).map((exercise) => ({
    id: exercise.id,
    type: 'exercise' as const,
    title: exercise.name,
    subtitle: exercise.muscle_group ?? undefined,
    href: `/library/exercises?q=${encodeURIComponent(exercise.name)}`,
  }))
}
