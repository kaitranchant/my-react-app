/**
 * Add Day 5 lunch (Asian Ground Turkey & Vegetable Bowls) to Liz McIntosh's
 * current October 2026 meal plan. One serving of the 6-serving recipe.
 *
 * Run: node scripts/append-liz-turkey-bowl-day.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENT_NAME = 'Liz McIntosh'
const PREVIOUS_NAME = 'Liz McIntosh Fat Loss 4-Day October 2026'
const MEAL_PLAN_NAME = 'Liz McIntosh Fat Loss 5-Day October 2026'
const MEAL_NAME = 'Asian Ground Turkey & Vegetable Bowls'
const MEAL_PLAN_DESCRIPTION =
  '5-day fat loss meal plan. Days 1–4 updated Oct 13 (~1,850 kcal · ~140g P · ~62g F · ~184g C · under 30g fiber). Day 5 is lunch only: Asian ground turkey and vegetable bowls. IBS-friendly, Aldi-friendly. Includes her vanilla PB2 smoothie, taco bowl, chili, Asian steak and rice bowl, apple + almond butter, and apple oatmeal cake. No kale, venison, or raw tomato.'

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
  if (!food) throw new Error(`USDA food not found: ${id}`)
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

const foods = [
  usdaFood('172851', 113),
  usdaFood('170379', 46),
  usdaFood('170393', 20),
  usdaFood('169291', 33),
  usdaFood('169961', 33),
  usdaFood('170000', 18),
  usdaFood('169230', 2),
  usdaFood('169231', 1),
  usdaFood('171413', 2.3),
  usdaFood('169704', 98),
  usdaFood('172473', 14),
  usdaFood('169640', 3.5),
  customFood('Rice vinegar', 5, {
    caloriesKcal: 1,
    proteinG: 0,
    carbsG: 0.2,
    fatG: 0,
  }),
  usdaFood('171016', 1.5),
  usdaFood('171186', 1.3),
  usdaFood('169698', 1),
]

const description =
  'Cook the rice. Brown the turkey with onion in the oil for 7–9 minutes, adding garlic and ginger for the last minute, to 165°F. Stir in carrots, broccoli, and green beans for 4–5 minutes, then zucchini for 3 minutes so they stay slightly firm. Whisk the sauce ingredients with 1/4 cup water, pour in, and simmer 2–3 minutes. Portion with 1/2 cup rice. Freeze up to 3 months.'

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
      .select('id, name, client_id, description')
      .eq('id', assignment.meal_plan_id)
      .maybeSingle()
  : { data: null }

const { data: namedPlans } = await supabase
  .from('meal_plans')
  .select('id, name, client_id, description')
  .eq('coach_id', client.coach_id)
  .in('name', [PREVIOUS_NAME, MEAL_PLAN_NAME])

const mealPlan =
  assignedPlan &&
  [PREVIOUS_NAME, MEAL_PLAN_NAME].includes(assignedPlan.name)
    ? assignedPlan
    : (namedPlans ?? []).find((plan) => plan.client_id === client.id) ??
      (namedPlans ?? []).find((plan) => plan.name === MEAL_PLAN_NAME) ??
      (namedPlans ?? [])[0]

if (!mealPlan) {
  console.error('Could not find Liz October meal plan.')
  process.exit(1)
}

console.log(
  `Using meal plan ${mealPlan.id} (${mealPlan.name})${mealPlan.client_id ? ' [client plan]' : ' [library]'}`
)

if (mealPlan.name !== MEAL_PLAN_NAME) {
  const { error: renameError } = await supabase
    .from('meal_plans')
    .update({ name: MEAL_PLAN_NAME, description: MEAL_PLAN_DESCRIPTION })
    .eq('id', mealPlan.id)
  if (renameError) throw renameError
  console.log(`Renamed plan to ${MEAL_PLAN_NAME}`)
}

const { data: existingDays, error: daysError } = await supabase
  .from('meal_plan_days')
  .select('id, day_offset, label, meals:meal_plan_meals(name)')
  .eq('meal_plan_id', mealPlan.id)
  .order('day_offset', { ascending: true })

if (daysError) throw daysError

const alreadyAdded = (existingDays ?? []).some((day) =>
  (day.meals ?? []).some((meal) => meal.name === MEAL_NAME)
)
if (alreadyAdded) {
  console.log(`${MEAL_NAME} is already on this plan.`)
  process.exit(0)
}

const nextOffset =
  (existingDays ?? []).reduce(
    (max, day) => Math.max(max, day.day_offset),
    -1
  ) + 1
const label = `Day ${nextOffset + 1}`

const { data: insertedDay, error: dayError } = await supabase
  .from('meal_plan_days')
  .insert({
    meal_plan_id: mealPlan.id,
    day_offset: nextOffset,
    label,
    notes:
      'Lunch only — Asian Ground Turkey & Vegetable Bowls. One serving of the 6-serving batch, with 1/2 cup cooked brown rice.',
  })
  .select('id')
  .single()

if (dayError) throw dayError

const totals = sumFoodMacros(foods)
const { data: insertedMeal, error: mealError } = await supabase
  .from('meal_plan_meals')
  .insert({
    meal_plan_day_id: insertedDay.id,
    meal_type: 'lunch',
    name: MEAL_NAME,
    description,
    sort_order: 0,
    calories_kcal: totals.calories_kcal,
    protein_g: totals.protein_g,
    carbs_g: totals.carbs_g,
    fat_g: totals.fat_g,
  })
  .select('id')
  .single()

if (mealError) throw mealError

const { error: foodsError } = await supabase.from('meal_plan_meal_foods').insert(
  foods.map((food, index) => ({
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
)

if (foodsError) throw foodsError

console.log(
  `Added ${label} lunch: ${totals.calories_kcal} kcal · ${totals.protein_g} P · ${totals.carbs_g} C · ${totals.fat_g} F`
)

const { data: existingLibrary } = await supabase
  .from('library_meals')
  .select('id')
  .eq('coach_id', client.coach_id)
  .eq('name', MEAL_NAME)
  .neq('status', 'archived')
  .limit(1)
  .maybeSingle()

if (existingLibrary) {
  console.log('Library already has this meal.')
} else {
  const { data: libraryMeal, error: libraryError } = await supabase
    .from('library_meals')
    .insert({
      coach_id: client.coach_id,
      name: MEAL_NAME,
      description,
      meal_type: 'lunch',
      status: 'active',
      calories_kcal: totals.calories_kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
    })
    .select('id')
    .single()

  if (libraryError || !libraryMeal) throw libraryError ?? new Error('library insert failed')

  const { error: libraryFoodsError } = await supabase.from('library_meal_foods').insert(
    foods.map((food, index) => ({
      library_meal_id: libraryMeal.id,
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
  )

  if (libraryFoodsError) {
    await supabase.from('library_meals').delete().eq('id', libraryMeal.id)
    throw libraryFoodsError
  }

  console.log('Copied the meal into the meal library.')
}

console.log(`Done. Plan ${mealPlan.id}`)
