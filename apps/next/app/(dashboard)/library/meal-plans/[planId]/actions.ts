'use server'

import { revalidatePath } from 'next/cache'

import {
  copyLibraryMealToPlanDay,
  copyPlanMealToLibrary,
} from '@/lib/meal-library-copy'
import { fetchLibraryMealWithFoods } from '@/lib/meal-library-data.server'
import { sumMealPlanMealFoodMacros } from '@/lib/meal-plan-meal-foods'
import { createClient } from '@/lib/supabase/server'
import { savePlanMealToLibrarySchema } from '@/lib/validations/meal-library'
import {
  mealPlanDayFormSchema,
  mealPlanDayUpdateSchema,
  mealPlanMealFoodFormSchema,
  mealPlanMealFormSchema,
  mealPlanMealUpdateSchema,
  type MealPlanDayFormValues,
  type MealPlanDayUpdateValues,
  type MealPlanMealFoodFormValues,
  type MealPlanMealFormValues,
  type MealPlanMealUpdateValues,
} from '@/lib/validations/nutrition'

export type ActionResult = { success: true } | { success: false; error: string }

async function requireMealPlanOwner(mealPlanId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: mealPlan, error } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('id', mealPlanId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !mealPlan) {
    return null
  }

  return { supabase, user, mealPlanId }
}

function revalidateMealPlanEditor(mealPlanId: string) {
  revalidatePath(`/library/meal-plans/${mealPlanId}`)
  revalidatePath('/library/meal-plans')
  revalidatePath('/portal/nutrition')
}

async function requireOwnedMeal(mealPlanId: string, mealId: string) {
  const ctx = await requireMealPlanOwner(mealPlanId)
  if (!ctx) return null

  const { data: meal, error: mealError } = await ctx.supabase
    .from('meal_plan_meals')
    .select('id, meal_plan_day_id, name, meal_type')
    .eq('id', mealId)
    .maybeSingle()

  if (mealError || !meal) return null

  const { data: day } = await ctx.supabase
    .from('meal_plan_days')
    .select('id')
    .eq('id', meal.meal_plan_day_id)
    .eq('meal_plan_id', mealPlanId)
    .maybeSingle()

  if (!day) return null

  return { ...ctx, meal }
}

function mealFoodValuesToRow(
  mealId: string,
  food: MealPlanMealFoodFormValues,
  sortOrder: number
) {
  return {
    meal_plan_meal_id: mealId,
    sort_order: sortOrder,
    food_name: food.foodName,
    source: food.source,
    external_id: food.externalId ?? null,
    quantity_g: food.quantityG,
    calories_kcal: food.caloriesKcal,
    protein_g: food.proteinG,
    carbs_g: food.carbsG,
    fat_g: food.fatG,
  }
}

async function syncMealMacrosFromFoods(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealId: string
) {
  const { data: foods, error } = await supabase
    .from('meal_plan_meal_foods')
    .select('calories_kcal, protein_g, carbs_g, fat_g')
    .eq('meal_plan_meal_id', mealId)

  if (error) {
    throw new Error(error.message)
  }

  const totals = sumMealPlanMealFoodMacros(foods ?? [])
  const { error: updateError } = await supabase
    .from('meal_plan_meals')
    .update({
      calories_kcal: totals.caloriesKcal,
      protein_g: totals.proteinG,
      carbs_g: totals.carbsG,
      fat_g: totals.fatG,
    })
    .eq('id', mealId)

  if (updateError) {
    throw new Error(updateError.message)
  }
}

function deriveMealName(
  mealType: MealPlanMealFormValues['mealType'],
  providedName: string | undefined,
  foods: MealPlanMealFoodFormValues[]
) {
  const trimmed = providedName?.trim()
  if (trimmed) return trimmed
  if (foods.length === 1) return foods[0].foodName
  if (foods.length > 1) {
    return `${foods[0].foodName} + ${foods.length - 1} more`
  }
  return `${mealType.charAt(0).toUpperCase()}${mealType.slice(1)}`
}

export async function createMealPlanDay(
  mealPlanId: string,
  values: MealPlanDayFormValues
): Promise<ActionResult> {
  const parsed = mealPlanDayFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireMealPlanOwner(mealPlanId)
  if (!ctx) {
    return { success: false, error: 'Meal plan not found.' }
  }

  const { error } = await ctx.supabase.from('meal_plan_days').insert({
    meal_plan_id: mealPlanId,
    day_offset: parsed.data.dayOffset,
    notes: parsed.data.notes,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export async function updateMealPlanDay(
  mealPlanId: string,
  dayId: string,
  values: MealPlanDayUpdateValues
): Promise<ActionResult> {
  const parsed = mealPlanDayUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireMealPlanOwner(mealPlanId)
  if (!ctx) {
    return { success: false, error: 'Meal plan not found.' }
  }

  const updates: { label?: string | null; notes?: string | null } = {}
  if (parsed.data.label !== undefined) updates.label = parsed.data.label
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await ctx.supabase
    .from('meal_plan_days')
    .update(updates)
    .eq('id', dayId)
    .eq('meal_plan_id', mealPlanId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlanEditor(mealPlanId)
  revalidatePath('/clients', 'layout')
  return { success: true }
}

export async function deleteMealPlanDay(
  mealPlanId: string,
  dayId: string
): Promise<ActionResult> {
  const ctx = await requireMealPlanOwner(mealPlanId)
  if (!ctx) {
    return { success: false, error: 'Meal plan not found.' }
  }

  const { error } = await ctx.supabase
    .from('meal_plan_days')
    .delete()
    .eq('id', dayId)
    .eq('meal_plan_id', mealPlanId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export async function createMealPlanMeal(
  mealPlanId: string,
  dayId: string,
  values: MealPlanMealFormValues
): Promise<ActionResult> {
  const parsed = mealPlanMealFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireMealPlanOwner(mealPlanId)
  if (!ctx) {
    return { success: false, error: 'Meal plan not found.' }
  }

  const { data: day, error: dayError } = await ctx.supabase
    .from('meal_plan_days')
    .select('id')
    .eq('id', dayId)
    .eq('meal_plan_id', mealPlanId)
    .maybeSingle()

  if (dayError || !day) {
    return { success: false, error: 'Meal plan day not found.' }
  }

  const foods = parsed.data.foods ?? []
  const macroTotals =
    foods.length > 0
      ? sumMealPlanMealFoodMacros(
          foods.map((food) => ({
            calories_kcal: food.caloriesKcal,
            protein_g: food.proteinG,
            carbs_g: food.carbsG,
            fat_g: food.fatG,
          }))
        )
      : {
          caloriesKcal: parsed.data.caloriesKcal,
          proteinG: parsed.data.proteinG,
          carbsG: parsed.data.carbsG,
          fatG: parsed.data.fatG,
        }

  const { data: meal, error } = await ctx.supabase
    .from('meal_plan_meals')
    .insert({
      meal_plan_day_id: dayId,
      meal_type: parsed.data.mealType,
      name: deriveMealName(parsed.data.mealType, parsed.data.name, foods),
      description: parsed.data.description,
      calories_kcal: macroTotals.caloriesKcal,
      protein_g: macroTotals.proteinG,
      carbs_g: macroTotals.carbsG,
      fat_g: macroTotals.fatG,
      sort_order: parsed.data.sortOrder ?? 0,
    })
    .select('id')
    .single()

  if (error || !meal) {
    return { success: false, error: error?.message ?? 'Could not create meal.' }
  }

  if (foods.length > 0) {
    const { error: foodsError } = await ctx.supabase
      .from('meal_plan_meal_foods')
      .insert(
        foods.map((food, index) => mealFoodValuesToRow(meal.id, food, index))
      )

    if (foodsError) {
      await ctx.supabase.from('meal_plan_meals').delete().eq('id', meal.id)
      return { success: false, error: foodsError.message }
    }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export async function addMealPlanMealFood(
  mealPlanId: string,
  mealId: string,
  values: MealPlanMealFoodFormValues
): Promise<ActionResult> {
  const parsed = mealPlanMealFoodFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireOwnedMeal(mealPlanId, mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const { count, error: countError } = await ctx.supabase
    .from('meal_plan_meal_foods')
    .select('id', { count: 'exact', head: true })
    .eq('meal_plan_meal_id', mealId)

  if (countError) {
    return { success: false, error: countError.message }
  }

  const { error } = await ctx.supabase.from('meal_plan_meal_foods').insert(
    mealFoodValuesToRow(mealId, parsed.data, count ?? 0)
  )

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await syncMealMacrosFromFoods(ctx.supabase, mealId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not update meal macros.',
    }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export async function deleteMealPlanMealFood(
  mealPlanId: string,
  mealId: string,
  foodId: string
): Promise<ActionResult> {
  const ctx = await requireOwnedMeal(mealPlanId, mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const { error } = await ctx.supabase
    .from('meal_plan_meal_foods')
    .delete()
    .eq('id', foodId)
    .eq('meal_plan_meal_id', mealId)

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await syncMealMacrosFromFoods(ctx.supabase, mealId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not update meal macros.',
    }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export async function updateMealPlanMeal(
  mealPlanId: string,
  mealId: string,
  values: MealPlanMealUpdateValues
): Promise<ActionResult> {
  const parsed = mealPlanMealUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireOwnedMeal(mealPlanId, mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const updates: {
    meal_type?: MealPlanMealFormValues['mealType']
    name?: string
    description?: string | null
  } = {}

  if (parsed.data.mealType !== undefined) {
    updates.meal_type = parsed.data.mealType
  }
  if (parsed.data.name !== undefined) {
    const trimmed = parsed.data.name.trim()
    const mealType = parsed.data.mealType ?? ctx.meal.meal_type
    updates.name =
      trimmed ||
      `${mealType.charAt(0).toUpperCase()}${mealType.slice(1)}`
  }
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description
  }

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await ctx.supabase
    .from('meal_plan_meals')
    .update(updates)
    .eq('id', mealId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export async function updateMealPlanMealFood(
  mealPlanId: string,
  mealId: string,
  foodId: string,
  values: MealPlanMealFoodFormValues
): Promise<ActionResult> {
  const parsed = mealPlanMealFoodFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireOwnedMeal(mealPlanId, mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const { data: existingFood, error: foodError } = await ctx.supabase
    .from('meal_plan_meal_foods')
    .select('id')
    .eq('id', foodId)
    .eq('meal_plan_meal_id', mealId)
    .maybeSingle()

  if (foodError || !existingFood) {
    return { success: false, error: 'Food not found.' }
  }

  const { error } = await ctx.supabase
    .from('meal_plan_meal_foods')
    .update({
      food_name: parsed.data.foodName,
      source: parsed.data.source,
      external_id: parsed.data.externalId ?? null,
      quantity_g: parsed.data.quantityG,
      calories_kcal: parsed.data.caloriesKcal,
      protein_g: parsed.data.proteinG,
      carbs_g: parsed.data.carbsG,
      fat_g: parsed.data.fatG,
    })
    .eq('id', foodId)
    .eq('meal_plan_meal_id', mealId)

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await syncMealMacrosFromFoods(ctx.supabase, mealId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not update meal macros.',
    }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export async function deleteMealPlanMeal(
  mealPlanId: string,
  mealId: string
): Promise<ActionResult> {
  const ctx = await requireMealPlanOwner(mealPlanId)
  if (!ctx) {
    return { success: false, error: 'Meal plan not found.' }
  }

  const { data: meal, error: mealError } = await ctx.supabase
    .from('meal_plan_meals')
    .select('id, meal_plan_day_id')
    .eq('id', mealId)
    .maybeSingle()

  if (mealError || !meal) {
    return { success: false, error: 'Meal not found.' }
  }

  const { data: day } = await ctx.supabase
    .from('meal_plan_days')
    .select('id')
    .eq('id', meal.meal_plan_day_id)
    .eq('meal_plan_id', mealPlanId)
    .maybeSingle()

  if (!day) {
    return { success: false, error: 'Meal not found on this plan.' }
  }

  const { error } = await ctx.supabase
    .from('meal_plan_meals')
    .delete()
    .eq('id', mealId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export type AddLibraryMealToPlanDayResult =
  | { success: true }
  | { success: false; error: string }

export async function addLibraryMealToPlanDay(
  mealPlanId: string,
  dayId: string,
  libraryMealId: string
): Promise<AddLibraryMealToPlanDayResult> {
  const ctx = await requireMealPlanOwner(mealPlanId)
  if (!ctx) {
    return { success: false, error: 'Meal plan not found.' }
  }

  const { data: day, error: dayError } = await ctx.supabase
    .from('meal_plan_days')
    .select('id')
    .eq('id', dayId)
    .eq('meal_plan_id', mealPlanId)
    .maybeSingle()

  if (dayError || !day) {
    return { success: false, error: 'Meal plan day not found.' }
  }

  const libraryMeal = await fetchLibraryMealWithFoods(
    ctx.supabase,
    ctx.user.id,
    libraryMealId
  )

  if (!libraryMeal) {
    return { success: false, error: 'Library meal not found.' }
  }

  if (libraryMeal.status !== 'active') {
    return { success: false, error: 'That library meal is not active.' }
  }

  const { count, error: countError } = await ctx.supabase
    .from('meal_plan_meals')
    .select('id', { count: 'exact', head: true })
    .eq('meal_plan_day_id', dayId)

  if (countError) {
    return { success: false, error: countError.message }
  }

  const result = await copyLibraryMealToPlanDay(
    ctx.supabase,
    libraryMeal,
    dayId,
    count ?? 0
  )

  if (!result.success) {
    return result
  }

  revalidateMealPlanEditor(mealPlanId)
  return { success: true }
}

export type SavePlanMealToLibraryResult =
  | { success: true; libraryMealId: string }
  | { success: false; error: string }

export async function savePlanMealToLibrary(
  mealPlanId: string,
  mealId: string,
  name: string
): Promise<SavePlanMealToLibraryResult> {
  const parsed = savePlanMealToLibrarySchema.safeParse({ name })
  if (!parsed.success) {
    return { success: false, error: 'Please enter a name for the library meal.' }
  }

  const ctx = await requireOwnedMeal(mealPlanId, mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const { data: meal, error: mealError } = await ctx.supabase
    .from('meal_plan_meals')
    .select(
      'name, description, meal_type, calories_kcal, protein_g, carbs_g, fat_g'
    )
    .eq('id', mealId)
    .maybeSingle()

  if (mealError || !meal) {
    return { success: false, error: 'Meal not found.' }
  }

  const { data: foods, error: foodsError } = await ctx.supabase
    .from('meal_plan_meal_foods')
    .select('*')
    .eq('meal_plan_meal_id', mealId)
    .order('sort_order', { ascending: true })

  if (foodsError) {
    return { success: false, error: foodsError.message }
  }

  const result = await copyPlanMealToLibrary(
    ctx.supabase,
    ctx.user.id,
    {
      name: parsed.data.name,
      description: meal.description,
      meal_type: meal.meal_type,
      calories_kcal: meal.calories_kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    },
    foods ?? []
  )

  if (!result.success) {
    return result
  }

  revalidatePath('/library/meals')
  revalidatePath(`/library/meals/${result.libraryMealId}`)
  return result
}
