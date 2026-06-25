import type { SupabaseClient } from '@supabase/supabase-js'

import { toDateKey } from '@/lib/calendar'

export type AssignMealPlanInternalResult =
  | { success: true }
  | { success: false; error: string }

export async function assignMealPlanToClientInternal(
  supabase: SupabaseClient,
  params: {
    coachId: string
    clientId: string
    mealPlanId: string
    startDate?: string
    teamId?: string
  }
): Promise<AssignMealPlanInternalResult> {
  const { coachId, clientId, mealPlanId, teamId } = params

  const { data: mealPlan, error: mealPlanError } = await supabase
    .from('meal_plans')
    .select('id, status')
    .eq('id', mealPlanId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (mealPlanError || !mealPlan) {
    return { success: false, error: 'Meal plan not found.' }
  }

  if (mealPlan.status === 'archived') {
    return { success: false, error: 'Archived meal plans cannot be assigned.' }
  }

  const { error: cancelError } = await supabase
    .from('meal_plan_assignments')
    .update({ status: 'cancelled' })
    .eq('client_id', clientId)
    .eq('coach_id', coachId)
    .eq('status', 'active')

  if (cancelError) {
    return { success: false, error: cancelError.message }
  }

  const startDate = params.startDate?.trim()
    ? params.startDate.trim()
    : toDateKey(new Date())

  const { error: assignError } = await supabase.from('meal_plan_assignments').insert({
    coach_id: coachId,
    client_id: clientId,
    meal_plan_id: mealPlanId,
    team_id: teamId ?? null,
    status: 'active',
    start_date: startDate,
  })

  if (assignError) {
    return { success: false, error: assignError.message }
  }

  return { success: true }
}

export async function cancelMealPlanAssignmentInternal(
  supabase: SupabaseClient,
  params: {
    coachId: string
    clientId: string
  }
): Promise<AssignMealPlanInternalResult> {
  const { coachId, clientId } = params

  const { error } = await supabase
    .from('meal_plan_assignments')
    .update({ status: 'cancelled' })
    .eq('client_id', clientId)
    .eq('coach_id', coachId)
    .eq('status', 'active')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
