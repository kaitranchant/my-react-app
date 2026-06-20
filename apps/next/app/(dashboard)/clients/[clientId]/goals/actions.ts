'use server'

import { revalidatePath } from 'next/cache'

import { getCompositionMetricConfig, resolveCompositionGoalTitle } from '@/lib/goal-progress'
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

  const updateRow: ClientGoalUpdate =
    parsed.data.category === 'composition'
      ? {
          metric: parsed.data.metric,
          direction: parsed.data.direction,
          target_amount: parsed.data.targetAmount,
          title: resolveCompositionGoalTitle(
            parsed.data.metric,
            parsed.data.title
          ),
          unit:
            getCompositionMetricConfig(parsed.data.metric)?.unit ??
            'lbs',
        }
      : {
          title: parsed.data.title,
          target_value: parsed.data.targetValue,
          comparison: parsed.data.comparison,
          unit: parsed.data.unit,
        }

  const { error } = await ctx.supabase
    .from('client_goals')
    .update(updateRow)
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
