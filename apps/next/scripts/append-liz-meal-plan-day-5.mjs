/**
 * Append Day 5 (lunch only: Buffalo Bowls) to Liz McIntosh's meal plan.
 *
 * Run: node scripts/append-liz-meal-plan-day-5.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const __dirname = dirname(fileURLToPath(import.meta.url))
const MEAL_PLAN_NAME = 'Liz McIntosh Fat Loss 4-Day August 2026'
const CLIENT_NAME = 'Liz McIntosh'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const catalog = JSON.parse(
  readFileSync(resolve(__dirname, '../data/foods.json'), 'utf8')
)

function roundMacro(value) {
  return Math.round(value * 10) / 10
}

function scaleFoodMacros(per100g, quantityG) {
  const factor = quantityG / 100
  return {
    caloriesKcal: roundMacro(per100g.caloriesKcal * factor),
    proteinG: roundMacro(per100g.proteinG * factor),
    carbsG: roundMacro(per100g.carbsG * factor),
    fatG: roundMacro(per100g.fatG * factor),
  }
}

function usdaFood(id, quantityG) {
  const food = catalog.find((entry) => entry.id === id)
  if (!food) {
    throw new Error(`USDA food not found: ${id}`)
  }
  const scaled = scaleFoodMacros(food.per100g, quantityG)
  return {
    source: 'usda',
    external_id: food.id,
    food_name: food.name,
    quantity_g: quantityG,
    calories_kcal: scaled.caloriesKcal,
    protein_g: scaled.proteinG,
    carbs_g: scaled.carbsG,
    fat_g: scaled.fatG,
  }
}

function customFood(name, quantityG, macros) {
  return {
    source: 'custom',
    external_id: null,
    food_name: name,
    quantity_g: quantityG,
    calories_kcal: macros.caloriesKcal,
    protein_g: macros.proteinG,
    carbs_g: macros.carbsG,
    fat_g: macros.fatG,
  }
}

function sumFoodMacros(foods) {
  return foods.reduce(
    (acc, food) => ({
      calories_kcal: roundMacro(acc.calories_kcal + food.calories_kcal),
      protein_g: roundMacro(acc.protein_g + food.protein_g),
      carbs_g: roundMacro(acc.carbs_g + food.carbs_g),
      fat_g: roundMacro(acc.fat_g + food.fat_g),
    }),
    { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )
}

function roundQty(n) {
  return Math.round(Number(n) * 100) / 100
}

function foodFingerprint(foods) {
  return [...foods]
    .map((f) =>
      [
        f.source ?? 'custom',
        f.external_id ?? '',
        String(f.food_name ?? '')
          .trim()
          .toLowerCase(),
        roundQty(f.quantity_g ?? 0),
      ].join('|')
    )
    .sort()
    .join('||')
}

function mealFingerprint(meal, foods) {
  return [
    meal.meal_type ?? 'other',
    Math.round(Number(meal.calories_kcal ?? 0)),
    Math.round(Number(meal.protein_g ?? 0)),
    Math.round(Number(meal.carbs_g ?? 0)),
    Math.round(Number(meal.fat_g ?? 0)),
    foodFingerprint(foods),
  ].join('::')
}

const buffaloBowlFoods = [
  usdaFood('168483', 100), // roasted / baked sweet potato
  usdaFood('169967', 120), // broccoli, cooked
  usdaFood('171534', 150), // grilled chicken breast
  customFood('Hot honey', 7, {
    caloriesKcal: 21.3,
    proteinG: 0,
    carbsG: 5.8,
    fatG: 0,
  }),
  usdaFood('330137', 30), // Greek yogurt nonfat, 2 tbsp
  customFood('Ranch seasoning', 2, {
    caloriesKcal: 5,
    proteinG: 0.2,
    carbsG: 1,
    fatG: 0,
  }),
  usdaFood('171413', 9), // olive oil, 2 tsp
]

const dayToAppend = {
  day_offset: 4,
  label: 'Day 5',
  notes: 'Lunch only — Buffalo Bowls.',
  meals: [
    {
      meal_type: 'lunch',
      name: 'Buffalo Bowls',
      sort_order: 0,
      foods: buffaloBowlFoods,
    },
  ],
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: client, error: clientError } = await supabase
  .from('clients')
  .select('id, coach_id, full_name')
  .ilike('full_name', `%${CLIENT_NAME}%`)
  .maybeSingle()

if (clientError || !client?.coach_id) {
  console.error('Could not find client:', clientError?.message ?? 'no row')
  process.exit(1)
}

const coachId = client.coach_id
console.log('Client', client.full_name, client.id)

const { data: assignment } = await supabase
  .from('meal_plan_assignments')
  .select('meal_plan_id')
  .eq('client_id', client.id)
  .eq('status', 'active')
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const { data: assignedPlan } = assignment?.meal_plan_id
  ? await supabase
      .from('meal_plans')
      .select('id, name, client_id')
      .eq('id', assignment.meal_plan_id)
      .maybeSingle()
  : { data: null }

const { data: clientPlan } = await supabase
  .from('meal_plans')
  .select('id, name, client_id')
  .eq('coach_id', coachId)
  .eq('client_id', client.id)
  .ilike('name', '%Liz McIntosh%Fat Loss%August 2026%')
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle()

const { data: libraryPlan } = await supabase
  .from('meal_plans')
  .select('id, name, client_id')
  .eq('coach_id', coachId)
  .eq('name', MEAL_PLAN_NAME)
  .is('client_id', null)
  .maybeSingle()

const mealPlan = assignedPlan ?? clientPlan ?? libraryPlan
if (!mealPlan) {
  console.error('Could not find Liz meal plan.')
  process.exit(1)
}

const mealPlanId = mealPlan.id
console.log(
  `Using meal plan ${mealPlanId} (${mealPlan.name})${mealPlan.client_id ? ' [client plan]' : ' [library]'}`
)

const { data: existingDays, error: daysError } = await supabase
  .from('meal_plan_days')
  .select('id, day_offset, label')
  .eq('meal_plan_id', mealPlanId)
  .order('day_offset', { ascending: true })

if (daysError) throw daysError

const existingOffsets = new Set((existingDays ?? []).map((day) => day.day_offset))
console.log(
  `Existing days: ${(existingDays ?? []).map((d) => d.label ?? `offset ${d.day_offset}`).join(', ') || '(none)'}`
)

if (existingOffsets.has(dayToAppend.day_offset)) {
  console.log(
    `Skipping ${dayToAppend.label} — day_offset ${dayToAppend.day_offset} already exists`
  )
  process.exit(0)
}

const { data: insertedDay, error: dayError } = await supabase
  .from('meal_plan_days')
  .insert({
    meal_plan_id: mealPlanId,
    day_offset: dayToAppend.day_offset,
    label: dayToAppend.label,
    notes: dayToAppend.notes,
  })
  .select('id')
  .single()

if (dayError) throw dayError

const mealTotalsByMeal = []

for (const meal of dayToAppend.meals) {
  const totals = sumFoodMacros(meal.foods)
  const { data: insertedMeal, error: mealError } = await supabase
    .from('meal_plan_meals')
    .insert({
      meal_plan_day_id: insertedDay.id,
      meal_type: meal.meal_type,
      name: meal.name,
      sort_order: meal.sort_order,
      calories_kcal: totals.calories_kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
    })
    .select('id')
    .single()

  if (mealError) throw mealError

  const foodRows = meal.foods.map((food, index) => ({
    meal_plan_meal_id: insertedMeal.id,
    sort_order: index,
    food_name: food.food_name,
    source: food.source,
    external_id: food.external_id,
    quantity_g: food.quantity_g,
    calories_kcal: food.calories_kcal,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
  }))

  const { error: foodsError } = await supabase
    .from('meal_plan_meal_foods')
    .insert(foodRows)

  if (foodsError) throw foodsError

  mealTotalsByMeal.push({ meal, totals, foodRows })
}

const dayTotals = sumFoodMacros(dayToAppend.meals.flatMap((meal) => meal.foods))
console.log(
  `Added ${dayToAppend.label}: ${dayTotals.calories_kcal} kcal · ${dayTotals.protein_g} P · ${dayTotals.fat_g} F · ${dayTotals.carbs_g} C`
)

const { data: libraryMeals, error: libError } = await supabase
  .from('library_meals')
  .select(
    `
    id,
    name,
    meal_type,
    calories_kcal,
    protein_g,
    carbs_g,
    fat_g,
    foods:library_meal_foods(
      sort_order,
      food_name,
      source,
      external_id,
      quantity_g
    )
  `
  )
  .eq('coach_id', coachId)
  .neq('status', 'archived')

if (libError) throw libError

const existingFingerprints = new Set(
  (libraryMeals ?? []).map((meal) => mealFingerprint(meal, meal.foods ?? []))
)

for (const { meal, totals, foodRows } of mealTotalsByMeal) {
  const fp = mealFingerprint(
    {
      meal_type: meal.meal_type,
      calories_kcal: totals.calories_kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
    },
    foodRows
  )

  if (existingFingerprints.has(fp)) {
    console.log(`Library already has ${meal.name}`)
    continue
  }

  const { data: libraryMeal, error: insertError } = await supabase
    .from('library_meals')
    .insert({
      coach_id: coachId,
      name: meal.name,
      description: null,
      meal_type: meal.meal_type,
      status: 'active',
      calories_kcal: totals.calories_kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
    })
    .select('id')
    .single()

  if (insertError || !libraryMeal) {
    console.error('Failed to insert library meal', meal.name, insertError)
    process.exit(1)
  }

  const { error: foodsError } = await supabase.from('library_meal_foods').insert(
    foodRows.map((food) => ({
      library_meal_id: libraryMeal.id,
      sort_order: food.sort_order,
      food_name: food.food_name,
      source: food.source,
      external_id: food.external_id,
      quantity_g: food.quantity_g,
      calories_kcal: food.calories_kcal,
      protein_g: food.protein_g,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
    }))
  )

  if (foodsError) {
    await supabase.from('library_meals').delete().eq('id', libraryMeal.id)
    console.error('Failed foods for', meal.name, foodsError)
    process.exit(1)
  }

  console.log(`Copied ${meal.name} into the meal library`)
}

console.log(`\nDone. Open /library/meal-plans/${mealPlanId}`)
