import { z } from 'zod'

import {
  NUTRITION_SETUP_ACTIVITY_LEVELS,
  NUTRITION_SETUP_BIOLOGICAL_SEX_OPTIONS,
  NUTRITION_SETUP_GOAL_OPTIONS,
} from '@/lib/nutrition-setup-options'
import type { MealType } from 'app/types/database'

const optionalPositiveNumber = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed
  })

const optionalNonNegativeNumber = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) return null
    return parsed
  })

const optionalNotes = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null) return null
    const trimmed = value.trim()
    return trimmed || null
  })

export const supplementSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  dosage: z.string().trim().max(80).nullable().optional(),
  timing: z.string().trim().max(80).nullable().optional(),
})

export const nutritionProfileFormSchema = z.object({
  caloriesKcal: optionalPositiveNumber,
  proteinG: optionalPositiveNumber,
  carbsG: optionalPositiveNumber,
  fatG: optionalPositiveNumber,
  fiberG: optionalPositiveNumber,
  waterMl: optionalPositiveNumber,
  notes: optionalNotes,
  dietaryRestrictions: optionalNotes,
  supplements: z.array(supplementSchema).default([]),
})

export const clientNutritionNotesSchema = z.object({
  clientNutritionNotes: optionalNotes,
})

const optionalAgeYears = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value) => {
    if (value == null || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(parsed) || parsed < 14 || parsed > 100) return null
    return Math.round(parsed)
  })

const optionalSetupBiologicalSex = z
  .union([z.enum(NUTRITION_SETUP_BIOLOGICAL_SEX_OPTIONS), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null))

const optionalActivityLevel = z
  .union([z.enum(NUTRITION_SETUP_ACTIVITY_LEVELS), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null))

export const nutritionSetupFormSchema = z.object({
  setupGoal: z
    .union([z.enum(NUTRITION_SETUP_GOAL_OPTIONS), z.literal(''), z.null()])
    .refine(
      (value): value is (typeof NUTRITION_SETUP_GOAL_OPTIONS)[number] =>
        value != null && value !== '',
      { message: 'Select a goal' }
    ),
  bodyWeightLbs: z
    .union([z.string(), z.number(), z.null()])
    .transform((value) => {
      if (value == null || value === '') return null
      const parsed = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return null
      return parsed
    })
    .refine((value): value is number => value != null, {
      message: 'Enter your current weight',
    }),
  heightIn: z
    .union([z.string(), z.number(), z.null()])
    .transform((value) => {
      if (value == null || value === '') return null
      const parsed = typeof value === 'number' ? value : Number(value)
      if (!Number.isFinite(parsed) || parsed <= 0) return null
      return parsed
    })
    .refine((value): value is number => value != null, {
      message: 'Enter your height',
    }),
  ageYears: optionalAgeYears,
  setupBiologicalSex: optionalSetupBiologicalSex,
  activityLevel: optionalActivityLevel,
  mealFrequency: optionalNotes,
  cookingTimeSkill: optionalNotes,
  budgetConstraints: optionalNotes,
  foodDislikes: optionalNotes,
  groceryAccess: optionalNotes,
  favoriteFoods: optionalNotes,
  currentCaloriesKcal: optionalPositiveNumber,
  currentProteinG: optionalPositiveNumber,
  currentCarbsG: optionalPositiveNumber,
  currentFatG: optionalPositiveNumber,
  dietaryRestrictions: optionalNotes,
  supplements: z.array(supplementSchema).default([]),
  additionalNotes: optionalNotes,
})

export const nutritionLogFormSchema = z.object({
  logDate: z.string().trim().min(1, 'Date is required'),
  adherenceScore: z.coerce
    .number()
    .int()
    .min(1, 'Select an adherence score')
    .max(5, 'Select an adherence score'),
  clientNotes: optionalNotes,
  fiberG: optionalNonNegativeNumber,
  waterMl: optionalNonNegativeNumber,
})

export const foodDiaryEntryFormSchema = z.object({
  logDate: z.string().trim().min(1, 'Date is required'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other']),
  foodName: z.string().trim().min(1, 'Food name is required').max(200),
  source: z.enum(['usda', 'custom']).nullable().optional(),
  externalId: z.string().trim().max(40).nullable().optional(),
  quantityG: optionalPositiveNumber,
  caloriesKcal: optionalNonNegativeNumber,
  proteinG: optionalNonNegativeNumber,
  carbsG: optionalNonNegativeNumber,
  fatG: optionalNonNegativeNumber,
  fiberG: optionalNonNegativeNumber,
})

export const mealPlanFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  status: z.enum(['draft', 'active', 'archived']),
})

export const mealPlanDayFormSchema = z.object({
  dayOffset: z.coerce.number().int().min(0, 'Day must be zero or greater'),
  notes: optionalNotes,
})

export const mealPlanDayUpdateSchema = z
  .object({
    label: optionalNotes,
    notes: optionalNotes,
  })
  .partial()

export const mealTypes = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'other',
] as const satisfies readonly MealType[]

export const mealPlanMealFoodFormSchema = z.object({
  source: z.enum(['usda', 'custom']),
  externalId: z.string().trim().max(40).nullable().optional(),
  foodName: z.string().trim().min(1, 'Food name is required').max(200),
  quantityG: z.coerce.number().positive('Enter a quantity in grams'),
  caloriesKcal: optionalNonNegativeNumber,
  proteinG: optionalNonNegativeNumber,
  carbsG: optionalNonNegativeNumber,
  fatG: optionalNonNegativeNumber,
  sortOrder: z.coerce.number().int().min(0).optional(),
})

export const mealPlanMealFormSchema = z.object({
  mealType: z.enum(mealTypes),
  name: z.string().trim().max(120, 'Name is too long').optional(),
  description: optionalNotes,
  caloriesKcal: optionalNonNegativeNumber,
  proteinG: optionalNonNegativeNumber,
  carbsG: optionalNonNegativeNumber,
  fatG: optionalNonNegativeNumber,
  sortOrder: z.coerce.number().int().min(0).optional(),
  foods: z.array(mealPlanMealFoodFormSchema).default([]),
}).superRefine((values, ctx) => {
  const hasFoods = values.foods.length > 0
  const hasName = Boolean(values.name?.trim())

  if (!hasFoods && !hasName) {
    ctx.addIssue({
      code: 'custom',
      message: 'Add at least one food or enter a meal name.',
      path: ['name'],
    })
  }
})

export const mealPlanAssignmentFormSchema = z.object({
  mealPlanId: z.string().uuid('Select a meal plan'),
  startDate: z.string().trim().min(1, 'Start date is required'),
})

export const clientMealPlanFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  startDate: z.string().trim().min(1, 'Start date is required'),
})

export type NutritionProfileFormValues = z.infer<typeof nutritionProfileFormSchema>
export type ClientNutritionNotesFormValues = z.infer<
  typeof clientNutritionNotesSchema
>
export type NutritionSetupFormInputValues = z.input<typeof nutritionSetupFormSchema>
export type NutritionSetupFormValues = z.output<typeof nutritionSetupFormSchema>
export type NutritionLogFormValues = z.infer<typeof nutritionLogFormSchema>
export type FoodDiaryEntryFormValues = z.infer<typeof foodDiaryEntryFormSchema>
export type MealPlanFormValues = z.infer<typeof mealPlanFormSchema>
export type MealPlanDayFormValues = z.infer<typeof mealPlanDayFormSchema>
export type MealPlanDayUpdateValues = z.infer<typeof mealPlanDayUpdateSchema>
export type MealPlanMealFormValues = z.infer<typeof mealPlanMealFormSchema>
export type MealPlanMealFoodFormValues = z.infer<typeof mealPlanMealFoodFormSchema>
export type MealPlanAssignmentFormValues = z.infer<
  typeof mealPlanAssignmentFormSchema
>
export type ClientMealPlanFormValues = z.infer<typeof clientMealPlanFormSchema>
