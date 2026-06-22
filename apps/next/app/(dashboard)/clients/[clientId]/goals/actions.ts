'use server'

import { revalidatePath } from 'next/cache'

import {
  formatHabitGoalLabel,
  formatMilestoneGoalLabel,
  getCompositionMetricConfig,
  resolveCompositionGoalTitle,
} from '@/lib/goal-progress'
import { requireClientAccess } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'
import {
  clientGoalFormSchema,
  type ClientGoalFormValues,
} from '@/lib/validations/client-goal'
import type {
  ClientGoalInsert,
  ClientGoalCategory,
  ClientGoalUpdate,
} from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidateGoalPaths(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal/goals')
  revalidatePath('/portal', 'layout')
}

async function nextSortOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  category: ClientGoalCategory
) {
  const { data } = await supabase
    .from('client_goals')
    .select('sort_order')
    .eq('client_id', clientId)
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.sort_order ?? -1) + 1
}

function goalValuesToInsert(
  values: ClientGoalFormValues,
  clientId: string,
  coachId: string,
  sortOrder: number
): ClientGoalInsert {
  if (values.category === 'composition') {
    const config = getCompositionMetricConfig(values.metric)
    return {
      client_id: clientId,
      coach_id: coachId,
      category: 'composition',
      metric: values.metric,
      direction: values.direction,
      target_amount: values.targetAmount,
      title: resolveCompositionGoalTitle(values.metric, values.title),
      unit: config?.unit ?? 'lbs',
      sort_order: sortOrder,
      target_date: values.targetDate,
      progress_source: values.progressSource ?? 'prefer_inbody',
    }
  }

  if (values.category === 'performance') {
    const title =
      values.title ??
      (values.performanceMetric === 'powerlifting_total'
        ? `Powerlifting total: ${values.comparison === 'at_most' ? 'under' : 'at least'} ${values.targetValue} ${values.unit}`
        : `Performance goal: ${values.comparison === 'at_most' ? 'under' : 'at least'} ${values.targetValue} ${values.unit}`)

    return {
      client_id: clientId,
      coach_id: coachId,
      category: 'performance',
      performance_metric: values.performanceMetric,
      exercise_id:
        values.performanceMetric === 'powerlifting_total'
          ? null
          : values.exerciseId ?? null,
      target_value: values.targetValue,
      comparison: values.comparison,
      unit: values.unit,
      title,
      sort_order: sortOrder,
      target_date: values.targetDate,
      metadata:
        values.performanceMetric === 'powerlifting_total'
          ? values.metadata ?? null
          : null,
    }
  }

  if (values.category === 'habit') {
    const title = values.title ?? formatHabitGoalLabel({
      id: '',
      client_id: clientId,
      coach_id: coachId,
      category: 'habit',
      metric: null,
      direction: null,
      target_amount: null,
      comparison: null,
      unit: null,
      sort_order: 0,
      created_at: '',
      updated_at: '',
      title: null,
      target_date: null,
      exercise_id: null,
      performance_metric: null,
      habit_source: values.habitSource,
      habit_frequency: values.habitFrequency,
      habit_period: 'week',
      milestone_type: null,
      milestone_target_count: null,
      program_id: null,
      progress_source: null,
      metadata: null,
      target_value:
        values.habitSource === 'nutrition_adherence'
          ? values.targetValue ?? 7
          : null,
    })

    return {
      client_id: clientId,
      coach_id: coachId,
      category: 'habit',
      habit_source: values.habitSource,
      habit_frequency: values.habitFrequency,
      habit_period: 'week',
      target_value:
        values.habitSource === 'nutrition_adherence'
          ? values.targetValue ?? 7
          : null,
      title,
      sort_order: sortOrder,
      target_date: values.targetDate,
    }
  }

  if (values.category === 'milestone') {
    const title = values.title ?? formatMilestoneGoalLabel({
      id: '',
      client_id: clientId,
      coach_id: coachId,
      category: 'milestone',
      metric: null,
      direction: null,
      target_amount: null,
      comparison: null,
      unit: null,
      sort_order: 0,
      created_at: '',
      updated_at: '',
      title: null,
      target_date: null,
      exercise_id: null,
      performance_metric: null,
      habit_source: null,
      habit_frequency: null,
      habit_period: null,
      milestone_type: values.milestoneType,
      milestone_target_count: values.milestoneTargetCount,
      program_id: values.programId ?? null,
      progress_source: null,
      metadata: null,
      target_value: null,
    })

    return {
      client_id: clientId,
      coach_id: coachId,
      category: 'milestone',
      milestone_type: values.milestoneType,
      milestone_target_count: values.milestoneTargetCount,
      program_id:
        values.milestoneType === 'program_completion'
          ? values.programId ?? null
          : null,
      title,
      sort_order: sortOrder,
      target_date: values.targetDate,
    }
  }

  return {
    client_id: clientId,
    coach_id: coachId,
    category: 'daily',
    title: values.title,
    target_value: values.targetValue,
    comparison: values.comparison,
    unit: values.unit,
    sort_order: sortOrder,
  }
}

function goalValuesToUpdate(values: ClientGoalFormValues): ClientGoalUpdate {
  if (values.category === 'composition') {
    return {
      metric: values.metric,
      direction: values.direction,
      target_amount: values.targetAmount,
      title: resolveCompositionGoalTitle(values.metric, values.title),
      unit: getCompositionMetricConfig(values.metric)?.unit ?? 'lbs',
      target_date: values.targetDate,
      progress_source: values.progressSource ?? 'prefer_inbody',
    }
  }

  if (values.category === 'performance') {
    return {
      performance_metric: values.performanceMetric,
      exercise_id:
        values.performanceMetric === 'powerlifting_total'
          ? null
          : values.exerciseId ?? null,
      target_value: values.targetValue,
      comparison: values.comparison,
      unit: values.unit,
      title: values.title,
      target_date: values.targetDate,
      metadata:
        values.performanceMetric === 'powerlifting_total'
          ? values.metadata ?? null
          : null,
    }
  }

  if (values.category === 'habit') {
    return {
      habit_source: values.habitSource,
      habit_frequency: values.habitFrequency,
      habit_period: 'week',
      target_value:
        values.habitSource === 'nutrition_adherence'
          ? values.targetValue ?? 7
          : null,
      title: values.title,
      target_date: values.targetDate,
    }
  }

  if (values.category === 'milestone') {
    return {
      milestone_type: values.milestoneType,
      milestone_target_count: values.milestoneTargetCount,
      program_id:
        values.milestoneType === 'program_completion'
          ? values.programId ?? null
          : null,
      title: values.title,
      target_date: values.targetDate,
    }
  }

  return {
    title: values.title,
    target_value: values.targetValue,
    comparison: values.comparison,
    unit: values.unit,
  }
}

export async function createClientGoal(
  clientId: string,
  values: ClientGoalFormValues
): Promise<ActionResult> {
  const parsed = clientGoalFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const sortOrder = await nextSortOrder(
    ctx.supabase,
    clientId,
    parsed.data.category
  )

  const row = goalValuesToInsert(
    parsed.data,
    clientId,
    ctx.user.id,
    sortOrder
  )

  const { error } = await ctx.supabase.from('client_goals').insert(row)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateGoalPaths(clientId)
  return { success: true }
}

export async function updateClientGoal(
  goalId: string,
  values: ClientGoalFormValues
): Promise<ActionResult> {
  const parsed = clientGoalFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from('client_goals')
    .select('id, client_id, category')
    .eq('id', goalId)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Goal not found.' }
  }

  const ctx = await requireClientAccess(existing.client_id)
  if (!ctx) {
    return { success: false, error: 'Goal not found.' }
  }

  if (existing.category !== parsed.data.category) {
    return { success: false, error: 'Goal type cannot be changed.' }
  }

  const { error } = await ctx.supabase
    .from('client_goals')
    .update(goalValuesToUpdate(parsed.data))
    .eq('id', goalId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateGoalPaths(existing.client_id)
  return { success: true }
}

export async function deleteClientGoal(goalId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: existing, error: fetchError } = await supabase
    .from('client_goals')
    .select('id, client_id')
    .eq('id', goalId)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Goal not found.' }
  }

  const ctx = await requireClientAccess(existing.client_id)
  if (!ctx) {
    return { success: false, error: 'Goal not found.' }
  }

  const { error } = await ctx.supabase
    .from('client_goals')
    .delete()
    .eq('id', goalId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateGoalPaths(existing.client_id)
  return { success: true }
}

export async function restoreClientGoal(
  goal: ClientGoalInsert & { id: string }
): Promise<ActionResult> {
  const ctx = await requireClientAccess(goal.client_id)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { error } = await ctx.supabase.from('client_goals').insert(goal)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateGoalPaths(goal.client_id)
  return { success: true }
}
