import { z } from 'zod'

import {
  COMPOSITION_GOAL_METRICS,
  formatCompositionGoalLabel,
  formatDailyTargetLabel,
  formatHabitGoalLabel,
  formatMilestoneGoalLabel,
  formatPerformanceGoalLabel,
} from '@/lib/goal-progress'
import type {
  ClientGoal,
  ClientGoalMetadata,
  CompositionGoalMetric,
} from 'app/types/database'

export const compositionGoalMetrics = COMPOSITION_GOAL_METRICS.map(
  (metric) => metric.key
) as [CompositionGoalMetric, ...CompositionGoalMetric[]]

export const goalDirections = ['decrease', 'increase'] as const
export const goalComparisons = ['at_least', 'at_most'] as const
export const performanceMetrics = [
  'weight',
  'reps',
  'e1rm',
  'time_seconds',
  'powerlifting_total',
] as const
export const habitSources = [
  'workouts_per_week',
  'check_in_submitted',
  'nutrition_adherence',
] as const
export const milestoneTypes = [
  'session_count',
  'program_completion',
  'training_streak_days',
] as const
export const progressSources = ['inbody', 'check_in', 'prefer_inbody'] as const

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

const requiredTargetDate = z
  .string()
  .trim()
  .min(1, 'Target date is required')

const powerliftingMetadataSchema = z.object({
  squatExerciseId: z.string().uuid().optional(),
  benchExerciseId: z.string().uuid().optional(),
  deadliftExerciseId: z.string().uuid().optional(),
})

export const compositionGoalFormSchema = z.object({
  category: z.literal('composition'),
  metric: z.enum(compositionGoalMetrics),
  direction: z.enum(goalDirections),
  targetAmount: positiveNumber,
  title: optionalTitle,
  targetDate: requiredTargetDate,
  progressSource: z.enum(progressSources).optional().nullable(),
})

export const dailyGoalFormSchema = z.object({
  category: z.literal('daily'),
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title is too long'),
  targetValue: positiveNumber,
  comparison: z.enum(goalComparisons),
  unit: z.string().trim().min(1, 'Unit is required').max(20, 'Unit is too long'),
})

export const performanceGoalFormSchema = z
  .object({
    category: z.literal('performance'),
    performanceMetric: z.enum(performanceMetrics),
    exerciseId: z.string().uuid().nullable().optional(),
    targetValue: positiveNumber,
    comparison: z.enum(goalComparisons),
    unit: z.string().trim().min(1, 'Unit is required').max(20, 'Unit is too long'),
    title: optionalTitle,
    targetDate: requiredTargetDate,
    metadata: powerliftingMetadataSchema.optional().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.performanceMetric === 'powerlifting_total') {
      if (
        !values.metadata?.squatExerciseId ||
        !values.metadata?.benchExerciseId ||
        !values.metadata?.deadliftExerciseId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select squat, bench, and deadlift exercises.',
          path: ['metadata'],
        })
      }
      return
    }

    if (!values.exerciseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select an exercise.',
        path: ['exerciseId'],
      })
    }
  })

export const habitGoalFormSchema = z.object({
  category: z.literal('habit'),
  habitSource: z.enum(habitSources),
  habitFrequency: z.coerce.number().int().positive('Enter a frequency greater than zero'),
  targetValue: z.coerce.number().positive().optional().nullable(),
  title: optionalTitle,
  targetDate: requiredTargetDate,
})

export const milestoneGoalFormSchema = z
  .object({
    category: z.literal('milestone'),
    milestoneType: z.enum(milestoneTypes),
    milestoneTargetCount: z.coerce
      .number()
      .int()
      .positive('Enter a target greater than zero'),
    programId: z.string().uuid().nullable().optional(),
    title: optionalTitle,
    targetDate: requiredTargetDate,
  })
  .superRefine((values, ctx) => {
    if (values.milestoneType === 'program_completion' && !values.programId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select a program.',
        path: ['programId'],
      })
    }
  })

export const clientGoalFormSchema = z.discriminatedUnion('category', [
  compositionGoalFormSchema,
  dailyGoalFormSchema,
  performanceGoalFormSchema,
  habitGoalFormSchema,
  milestoneGoalFormSchema,
])

export type CompositionGoalFormValues = z.infer<typeof compositionGoalFormSchema>
export type DailyGoalFormValues = z.infer<typeof dailyGoalFormSchema>
export type PerformanceGoalFormValues = z.infer<typeof performanceGoalFormSchema>
export type HabitGoalFormValues = z.infer<typeof habitGoalFormSchema>
export type MilestoneGoalFormValues = z.infer<typeof milestoneGoalFormSchema>
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
  {
    category: 'daily',
    title: 'Water',
    targetValue: 64,
    comparison: 'at_least',
    unit: 'oz',
  },
  {
    category: 'daily',
    title: 'Protein',
    targetValue: 150,
    comparison: 'at_least',
    unit: 'g',
  },
  {
    category: 'daily',
    title: 'Sleep',
    targetValue: 8,
    comparison: 'at_least',
    unit: 'hours',
  },
  {
    category: 'daily',
    title: 'Active minutes',
    targetValue: 30,
    comparison: 'at_least',
    unit: 'min',
  },
]

export function createEmptyCompositionGoalValues(): CompositionGoalFormValues {
  return {
    category: 'composition',
    metric: 'weight_lbs',
    direction: 'decrease',
    targetAmount: 20,
    title: null,
    targetDate: '',
    progressSource: 'prefer_inbody',
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

export function createEmptyPerformanceGoalValues(): PerformanceGoalFormValues {
  return {
    category: 'performance',
    performanceMetric: 'weight',
    exerciseId: null,
    targetValue: 225,
    comparison: 'at_least',
    unit: 'lbs',
    title: null,
    targetDate: '',
    metadata: null,
  }
}

export function createEmptyHabitGoalValues(): HabitGoalFormValues {
  return {
    category: 'habit',
    habitSource: 'workouts_per_week',
    habitFrequency: 4,
    targetValue: null,
    title: null,
    targetDate: '',
  }
}

export function createEmptyMilestoneGoalValues(): MilestoneGoalFormValues {
  return {
    category: 'milestone',
    milestoneType: 'session_count',
    milestoneTargetCount: 20,
    programId: null,
    title: null,
    targetDate: '',
  }
}

export type TrackableGoalCategory = Exclude<
  ClientGoal['category'],
  'daily'
>

export const TRACKABLE_GOAL_TYPE_OPTIONS: {
  value: TrackableGoalCategory
  label: string
  description: string
}[] = [
  {
    value: 'composition',
    label: 'Body composition',
    description: 'InBody scans or check-in weight progress.',
  },
  {
    value: 'performance',
    label: 'Performance',
    description: 'Lift targets from workout PRs and powerlifting totals.',
  },
  {
    value: 'habit',
    label: 'Habit',
    description: 'Weekly consistency from workouts and check-ins.',
  },
  {
    value: 'milestone',
    label: 'Milestone',
    description: 'Session counts, program completion, and streaks.',
  },
]

export function createEmptyTrackableGoalValues(
  category: TrackableGoalCategory
): Exclude<ClientGoalFormValues, DailyGoalFormValues> {
  switch (category) {
    case 'composition':
      return createEmptyCompositionGoalValues()
    case 'performance':
      return createEmptyPerformanceGoalValues()
    case 'habit':
      return createEmptyHabitGoalValues()
    case 'milestone':
      return createEmptyMilestoneGoalValues()
  }
}

export function getTrackableGoalCategoryLabel(
  category: TrackableGoalCategory
): string {
  return (
    TRACKABLE_GOAL_TYPE_OPTIONS.find((option) => option.value === category)
      ?.label ?? category
  )
}

function parseMetadata(metadata: ClientGoalMetadata | null | undefined) {
  if (!metadata) return null
  return metadata
}

export function clientGoalToFormValues(goal: ClientGoal): ClientGoalFormValues {
  if (goal.category === 'composition') {
    return {
      category: 'composition',
      metric: (goal.metric ?? 'weight_lbs') as CompositionGoalFormValues['metric'],
      direction: goal.direction ?? 'decrease',
      targetAmount: Number(goal.target_amount ?? 0),
      title: goal.title,
      targetDate: goal.target_date ?? '',
      progressSource: goal.progress_source ?? 'prefer_inbody',
    }
  }

  if (goal.category === 'performance') {
    return {
      category: 'performance',
      performanceMetric: goal.performance_metric ?? 'weight',
      exerciseId: goal.exercise_id,
      targetValue: Number(goal.target_value ?? 0),
      comparison: goal.comparison ?? 'at_least',
      unit: goal.unit?.trim() ?? 'lbs',
      title: goal.title,
      targetDate: goal.target_date ?? '',
      metadata: parseMetadata(goal.metadata),
    }
  }

  if (goal.category === 'habit') {
    return {
      category: 'habit',
      habitSource: goal.habit_source ?? 'workouts_per_week',
      habitFrequency: Number(goal.habit_frequency ?? 1),
      targetValue:
        goal.habit_source === 'nutrition_adherence'
          ? Number(goal.target_value ?? 7)
          : null,
      title: goal.title,
      targetDate: goal.target_date ?? '',
    }
  }

  if (goal.category === 'milestone') {
    return {
      category: 'milestone',
      milestoneType: goal.milestone_type ?? 'session_count',
      milestoneTargetCount: Number(goal.milestone_target_count ?? 1),
      programId: goal.program_id,
      title: goal.title,
      targetDate: goal.target_date ?? '',
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

export function formatGoalListLabel(goal: ClientGoal): string {
  if (goal.category === 'daily') return formatDailyTargetLabel(goal)
  if (goal.category === 'composition') return formatCompositionGoalLabel(goal)
  if (goal.category === 'performance') return formatPerformanceGoalLabel(goal)
  if (goal.category === 'habit') return formatHabitGoalLabel(goal)
  return formatMilestoneGoalLabel(goal)
}
