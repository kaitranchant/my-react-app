import { z } from 'zod'

import { mealPlanMealFoodFormSchema, mealTypes } from '@/lib/validations/nutrition'

export const libraryMealStatuses = ['active', 'archived'] as const

export const libraryMealFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  mealType: z.enum(mealTypes),
  status: z.enum(libraryMealStatuses),
  foods: z.array(mealPlanMealFoodFormSchema),
}).superRefine((values, ctx) => {
  if (values.foods.length === 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Add at least one food.',
      path: ['foods'],
    })
  }
})

export const libraryMealUpdateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
    description: z
      .union([z.string().trim().max(2000, 'Description is too long'), z.null()])
      .optional(),
    mealType: z.enum(mealTypes),
  })
  .partial()

export const savePlanMealToLibrarySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
})

export type LibraryMealFormValues = z.infer<typeof libraryMealFormSchema>
export type LibraryMealUpdateValues = z.infer<typeof libraryMealUpdateSchema>
export type SavePlanMealToLibraryValues = z.infer<
  typeof savePlanMealToLibrarySchema
>

export const libraryMealFormDefaults: LibraryMealFormValues = {
  name: '',
  description: '',
  mealType: 'breakfast',
  status: 'active',
  foods: [],
}
