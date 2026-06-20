import { z } from 'zod'

import { COMPOSITION_GOAL_METRICS } from '@/lib/goal-progress'
import type { ClientGoal, CompositionGoalMetric } from 'app/types/database'

export const compositionGoalMetrics = COMPOSITION_GOAL_METRICS.map(
  (metric) => metric.key
) as [CompositionGoalMetric, ...CompositionGoalMetric[]]

export const goalDirections = ['decrease', 'increase'] as const
export const goalComparisons = ['at_least', 'at_most'] as const

const positiveNumber = z.coerce
  .number()
  .positive('Enter a value greater than zero')

const optionalTitle = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return null
    const trimmed = value.trim()
    return trimmed || null
  })

export const compositionGoalFormSchema = z.object({
  category: z.literal('composition'),
  metric: z.enum(compositionGoalMetrics),
  direction: z.enum(goalDirections),
  targetAmount: positiveNumber,
  title: optionalTitle,
})

export const dailyGoalFormSchema = z.object({
  category: z.literal('daily'),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title is too long'),
  targetValue: positiveNumber,
  comparison: z.enum(goalComparisons),
  unit: z.string().trim().min(1, 'Unit is required').max(20, 'Unit is too long'),
})

export const clientGoalFormSchema = z.discriminatedUnion('category', [
  compositionGoalFormSchema,
  dailyGoalFormSchema,
])

export type CompositionGoalFormValues = z.infer<typeof compositionGoalFormSchema>
export type DailyGoalFormValues = z.infer<typeof dailyGoalFormSchema>
export type ClientGoalFormValues = z.infer<typeof clientGoalFormSchema>

export const DAILY_GOAL_PRESETS: DailyGoalFormValues[] = [
  {
    category: 'daily',
    title: 'Steps',
    targetValue: 10000,
    comparison: 'at_least',
    unit: 'steps',
  },
  {
    category: 'daily',
    title: 'Calories',
    targetValue: 2000,
    comparison: 'at_most',
    unit: 'kcal',
  },
]

export function createEmptyCompositionGoalValues(): CompositionGoalFormValues {
  return {
    category: 'composition',
    metric: 'weight_lbs',
    direction: 'decrease',
    targetAmount: 20,
    title: null,
  }
}

export function createEmptyDailyGoalValues(): DailyGoalFormValues {
  return {
    category: 'daily',
    title: '',
    targetValue: 10000,
    comparison: 'at_least',
    unit: 'steps',
  }
}

export function clientGoalToFormValues(goal: ClientGoal): ClientGoalFormValues {
  if (goal.category === 'composition') {
    return {
      category: 'composition',
      metric: (goal.metric ?? 'weight_lbs') as CompositionGoalFormValues['metric'],
      direction: goal.direction ?? 'decrease',
      targetAmount: Number(goal.target_amount ?? 0),
      title: goal.title,
    }
  }

  return {
    category: 'daily',
    title: goal.title?.trim() ?? '',
    targetValue: Number(goal.target_value ?? 0),
    comparison: goal.comparison ?? 'at_least',
    unit: goal.unit?.trim() ?? '',
  }
}
