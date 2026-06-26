'use server'

import { createClient } from '@/lib/supabase/server'

const RESULT_LIMIT = 8

export type GlobalSearchResultType =
  | 'client'
  | 'workout'
  | 'program'
  | 'exercise'
  | 'meal_plan'

export type GlobalSearchResult = {
  id: string
  type: GlobalSearchResultType
  title: string
  subtitle?: string
  href: string
}

export type GlobalSearchResponse =
  | { success: true; results: GlobalSearchResult[] }
  | { success: false; error: string }

export async function globalSearch(
  query: string
): Promise<GlobalSearchResponse> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { success: true, results: [] }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const term = `%${trimmed}%`

  const [clientsRes, workoutsRes, programsRes, exercisesRes, mealPlansRes] =
    await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, email')
        .eq('is_coach_self', false)
        .or(`full_name.ilike.${term},email.ilike.${term}`)
        .order('full_name')
        .limit(RESULT_LIMIT),
      supabase
        .from('workouts')
        .select('id, name, description')
        .ilike('name', term)
        .order('name')
        .limit(RESULT_LIMIT),
      supabase
        .from('programs')
        .select('id, name, description')
        .ilike('name', term)
        .order('name')
        .limit(RESULT_LIMIT),
      supabase
        .from('exercises')
        .select('id, name, muscle_group')
        .ilike('name', term)
        .order('name')
        .limit(RESULT_LIMIT),
      supabase
        .from('meal_plans')
        .select('id, name, description')
        .eq('coach_id', user.id)
        .is('client_id', null)
        .ilike('name', term)
        .order('name')
        .limit(RESULT_LIMIT),
    ])

  const queryError =
    clientsRes.error ??
    workoutsRes.error ??
    programsRes.error ??
    exercisesRes.error ??
    mealPlansRes.error

  if (queryError) {
    return { success: false, error: queryError.message }
  }

  const results: GlobalSearchResult[] = [
    ...(clientsRes.data ?? []).map((client) => ({
      id: client.id,
      type: 'client' as const,
      title: client.full_name,
      subtitle: client.email ?? undefined,
      href: `/clients/${client.id}`,
    })),
    ...(workoutsRes.data ?? []).map((workout) => ({
      id: workout.id,
      type: 'workout' as const,
      title: workout.name,
      subtitle: workout.description ?? undefined,
      href: `/library/workouts?q=${encodeURIComponent(workout.name)}`,
    })),
    ...(programsRes.data ?? []).map((program) => ({
      id: program.id,
      type: 'program' as const,
      title: program.name,
      subtitle: program.description ?? undefined,
      href: `/library/programs/${program.id}`,
    })),
    ...(exercisesRes.data ?? []).map((exercise) => ({
      id: exercise.id,
      type: 'exercise' as const,
      title: exercise.name,
      subtitle: exercise.muscle_group ?? undefined,
      href: `/library/exercises?q=${encodeURIComponent(exercise.name)}`,
    })),
    ...(mealPlansRes.data ?? []).map((mealPlan) => ({
      id: mealPlan.id,
      type: 'meal_plan' as const,
      title: mealPlan.name,
      subtitle: mealPlan.description ?? undefined,
      href: `/library/meal-plans/${mealPlan.id}`,
    })),
  ]

  return { success: true, results }
}
