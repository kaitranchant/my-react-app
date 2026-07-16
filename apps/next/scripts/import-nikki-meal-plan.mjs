/**
 * Import Nikki Sharpsteen's 4-day fat loss meal plan into the coach library.
 * Run: node scripts/import-nikki-meal-plan.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const __dirname = dirname(fileURLToPath(import.meta.url))
const MEAL_PLAN_NAME = 'Nikki Sharpsteen Fat Loss 4-Day'
const CLIENT_NAME = 'Nikki Sharpsteen'
const MEAL_PLAN_DESCRIPTION =
  '6-day fat loss meal plan (~1,450 kcal/day target). Client: 136 lbs, sedentary job, 2x/week resistance training. Includes sweet snacks daily. Days 5–6 add Mediterranean / Tex-Mex / Asian variety.'

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

const creamerServing = customFood('Coffee creamer (Laird Superfood)', 15, {
  caloriesKcal: 45,
  proteinG: 0,
  carbsG: 3,
  fatG: 4,
})

const mealPlanDays = [
  {
    label: 'Day 1',
    notes: '3 meals + 1 snack',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast',
        sort_order: 0,
        foods: [
          usdaFood('330137', 200),
          usdaFood('2346396', 30),
          usdaFood('169640', 10),
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Lunch',
        sort_order: 1,
        foods: [
          usdaFood('171534', 140),
          usdaFood('168917', 100),
          usdaFood('168462', 50),
          usdaFood('2258590', 50),
          usdaFood('171413', 7),
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Dinner',
        sort_order: 2,
        foods: [
          usdaFood('175168', 140),
          usdaFood('168483', 150),
          usdaFood('169141', 100),
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [usdaFood('170273', 20), usdaFood('327699', 100)],
      },
    ],
  },
  {
    label: 'Day 2',
    notes: '3 meals + 2 snacks (training day)',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast',
        sort_order: 0,
        foods: [
          usdaFood('2346396', 45),
          usdaFood('330137', 150),
          usdaFood('173944', 100),
          usdaFood('171320', 1),
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Lunch',
        sort_order: 1,
        foods: [
          usdaFood('171496', 140),
          usdaFood('169704', 120),
          usdaFood('170472', 150),
          usdaFood('171413', 7),
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Dinner',
        sort_order: 2,
        foods: [
          usdaFood('175180', 150),
          usdaFood('168910', 100),
          usdaFood('171192', 100),
          usdaFood('171247', 15),
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack 1',
        sort_order: 3,
        foods: [usdaFood('1105781', 150), usdaFood('329370', 28)],
      },
      {
        meal_type: 'snack',
        name: 'Snack 2 (sweet)',
        sort_order: 4,
        foods: [
          usdaFood('173417', 100),
          usdaFood('169593', 5),
          usdaFood('169640', 10),
          usdaFood('167976', 10),
        ],
      },
    ],
  },
  {
    label: 'Day 3',
    notes: '3 meals + 1 snack',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast',
        sort_order: 0,
        foods: [
          usdaFood('748967', 150),
          usdaFood('172689', 28),
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Lunch',
        sort_order: 1,
        foods: [
          usdaFood('171534', 150),
          usdaFood('168917', 100),
          usdaFood('169291', 75),
          usdaFood('2258590', 75),
          usdaFood('171413', 7),
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Dinner',
        sort_order: 2,
        foods: [
          usdaFood('171956', 170),
          usdaFood('169704', 120),
          usdaFood('168390', 100),
          usdaFood('171413', 7),
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('172694', 30),
          usdaFood('2263889', 50),
          usdaFood('167755', 50),
        ],
      },
    ],
  },
  {
    label: 'Day 4',
    notes: '3 meals + 1 snack',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast',
        sort_order: 0,
        foods: [
          usdaFood('330137', 150),
          usdaFood('173944', 100),
          usdaFood('321359', 200),
          usdaFood('169640', 10),
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Lunch',
        sort_order: 1,
        foods: [
          usdaFood('330869', 140),
          usdaFood('174090', 50),
          usdaFood('168462', 80),
          usdaFood('171413', 7),
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Dinner',
        sort_order: 2,
        foods: [
          usdaFood('174024', 140),
          usdaFood('168483', 150),
          usdaFood('169141', 100),
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150),
          usdaFood('167976', 15),
          usdaFood('169640', 5),
        ],
      },
    ],
  },
  {
    label: 'Day 5',
    notes: '3 meals + 1 snack — breakfast burrito, Mediterranean lunch, turkey chili',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast Burrito + Coffee',
        sort_order: 0,
        foods: [
          usdaFood('174081', 50),
          usdaFood('172183', 100),
          usdaFood('2644285', 50),
          usdaFood('328637', 20),
          usdaFood('324038', 30),
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Chickpea Chicken Mediterranean Bowl',
        sort_order: 1,
        foods: [
          usdaFood('173800', 150),
          usdaFood('171534', 100),
          usdaFood('168409', 75),
          usdaFood('170457', 75),
          usdaFood('173420', 30),
          usdaFood('171413', 7),
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Turkey Chili',
        sort_order: 2,
        foods: [
          usdaFood('330869', 120),
          usdaFood('2644285', 100),
          usdaFood('333281', 100),
          usdaFood('170000', 25),
          usdaFood('2258590', 25),
          usdaFood('328637', 20),
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150),
          usdaFood('173948', 40),
          usdaFood('327699', 40),
          usdaFood('169640', 8),
        ],
      },
    ],
  },
  {
    label: 'Day 6',
    notes: '3 meals + 1 snack — smoothie bowl, tuna bowl, pork tenderloin',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Protein Smoothie Bowl + Coffee',
        sort_order: 0,
        foods: [
          usdaFood('173944', 100),
          usdaFood('330137', 150),
          usdaFood('321359', 150),
          usdaFood('173180', 30),
          usdaFood('171646', 20),
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Tuna Rice Bowl',
        sort_order: 1,
        foods: [
          usdaFood('334194', 130),
          usdaFood('169704', 100),
          usdaFood('168411', 50),
          usdaFood('168409', 50),
          usdaFood('2258587', 50),
          customFood('Soy-sesame dressing', 7, {
            caloriesKcal: 35,
            proteinG: 0.5,
            carbsG: 1.5,
            fatG: 3.2,
          }),
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Pork Tenderloin + Sweet Potato',
        sort_order: 2,
        foods: [
          usdaFood('168250', 170),
          usdaFood('168483', 150),
          usdaFood('169141', 100),
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('171723', 20),
          usdaFood('170562', 15),
          usdaFood('167976', 10),
        ],
      },
    ],
  },
]

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: client, error: clientError } = await supabase
  .from('clients')
  .select('id, coach_id')
  .eq('full_name', CLIENT_NAME)
  .maybeSingle()

if (clientError || !client?.coach_id) {
  console.error('Could not find client:', clientError?.message)
  process.exit(1)
}

const coachId = client.coach_id

let mealPlanId
const { data: existingPlan } = await supabase
  .from('meal_plans')
  .select('id')
  .eq('coach_id', coachId)
  .eq('name', MEAL_PLAN_NAME)
  .is('client_id', null)
  .maybeSingle()

if (existingPlan) {
  mealPlanId = existingPlan.id
  console.log(`Updating existing meal plan ${mealPlanId}`)
  await supabase
    .from('meal_plans')
    .update({
      status: 'active',
      description: MEAL_PLAN_DESCRIPTION,
    })
    .eq('id', mealPlanId)
} else {
  const { data: inserted, error } = await supabase
    .from('meal_plans')
    .insert({
      coach_id: coachId,
      name: MEAL_PLAN_NAME,
      description: MEAL_PLAN_DESCRIPTION,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) throw error
  mealPlanId = inserted.id
  console.log(`Created meal plan ${mealPlanId}`)
}

const { data: existingDays } = await supabase
  .from('meal_plan_days')
  .select('id')
  .eq('meal_plan_id', mealPlanId)

for (const day of existingDays ?? []) {
  const { data: meals } = await supabase
    .from('meal_plan_meals')
    .select('id')
    .eq('meal_plan_day_id', day.id)

  for (const meal of meals ?? []) {
    await supabase.from('meal_plan_meal_foods').delete().eq('meal_plan_meal_id', meal.id)
  }

  await supabase.from('meal_plan_meals').delete().eq('meal_plan_day_id', day.id)
  await supabase.from('meal_plan_days').delete().eq('id', day.id)
}

for (const [dayIndex, day] of mealPlanDays.entries()) {
  const { data: insertedDay, error: dayError } = await supabase
    .from('meal_plan_days')
    .insert({
      meal_plan_id: mealPlanId,
      day_offset: dayIndex,
      label: day.label,
      notes: day.notes,
    })
    .select('id')
    .single()

  if (dayError) throw dayError

  for (const meal of day.meals) {
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
  }

  const dayTotals = sumFoodMacros(day.meals.flatMap((meal) => meal.foods))
  console.log(
    `${day.label}: ${dayTotals.calories_kcal} kcal · ${dayTotals.protein_g} P · ${dayTotals.fat_g} F · ${dayTotals.carbs_g} C`
  )
}

console.log(`\nDone. Meal plan: /library/meal-plans/${mealPlanId}`)
