/**
 * Create "Nikki Sharpsteen Fat Loss 6-Day August 2026" from
 * nikki-6-day-meal-plan-updated.md (no cottage cheese / pork; adds avocado,
 * salads, rye/sourdough, dates, nuts, hard-boiled eggs).
 *
 * Run: node scripts/import-nikki-meal-plan-aug-2026.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const __dirname = dirname(fileURLToPath(import.meta.url))
const MEAL_PLAN_NAME = 'Nikki Sharpsteen Fat Loss 6-Day August 2026'
const CLIENT_NAME = 'Nikki Sharpsteen'
const MEAL_PLAN_DESCRIPTION =
  '6-day fat loss meal plan (~1,450 kcal · ~125g P · ~48g F · ~130g C). Updated Aug 2026: removed cottage cheese & pork; added hard-boiled eggs, rye/sourdough, salads, avocado, dates, nuts/nut butter. Portions/cuts adjusted to match USDA entries within daily targets.'

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

const soySesameDressing = customFood('Soy-sesame dressing', 7, {
  caloriesKcal: 35,
  proteinG: 0.5,
  carbsG: 1.5,
  fatG: 3.2,
})

const balsamicVinaigrette = customFood('Balsamic vinaigrette', 15, {
  caloriesKcal: 45,
  proteinG: 0,
  carbsG: 2,
  fatG: 4,
})

const mealPlanDays = [
  {
    label: 'Day 1',
    notes: '3 meals + 1 snack — avocado toast snack (no cottage cheese)',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Oats + Yogurt',
        sort_order: 0,
        foods: [
          usdaFood('330137', 200), // Greek yogurt nonfat
          usdaFood('2346396', 30), // rolled oats
          usdaFood('169640', 10), // honey
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Chicken + Quinoa',
        sort_order: 1,
        foods: [
          usdaFood('171534', 140), // chicken breast grilled
          usdaFood('168917', 100), // quinoa cooked
          usdaFood('169288', 50), // spinach cooked
          usdaFood('2258590', 50), // red bell pepper
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Salmon + Sweet Potato',
        sort_order: 2,
        foods: [
          usdaFood('175168', 140), // salmon cooked
          usdaFood('168483', 150), // sweet potato baked
          usdaFood('169141', 100), // green beans
        ],
      },
      {
        meal_type: 'snack',
        name: 'Avocado Toast + Hard Boiled Egg',
        sort_order: 3,
        foods: [
          usdaFood('172684', 30), // rye bread
          usdaFood('171705', 50), // avocado
          usdaFood('173424', 50), // hard-boiled egg
        ],
      },
    ],
  },
  {
    label: 'Day 2',
    notes:
      '3 meals + 2 snacks — trimmed veggies/pasta/oil/almond butter to hit ~1,450 kcal',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast',
        sort_order: 0,
        foods: [
          usdaFood('2346396', 35), // oats
          usdaFood('330137', 150), // Greek yogurt
          usdaFood('173944', 100), // banana
          usdaFood('171320', 1), // cinnamon
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Lunch',
        sort_order: 1,
        foods: [
          usdaFood('171496', 140), // turkey breast
          usdaFood('169704', 90), // brown rice cooked
          usdaFood('170472', 100), // mixed vegetables (trimmed)
          usdaFood('171413', 4), // olive oil (trimmed)
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Dinner',
        sort_order: 2,
        foods: [
          usdaFood('175180', 150), // shrimp cooked
          usdaFood('168910', 60), // whole wheat pasta (trimmed)
          usdaFood('171192', 100), // marinara
          usdaFood('171247', 15), // parmesan
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack 1',
        sort_order: 3,
        foods: [
          usdaFood('1105781', 150), // apple
          usdaFood('329370', 28), // string cheese
        ],
      },
      {
        meal_type: 'snack',
        name: 'Dates + Almond Butter',
        sort_order: 4,
        foods: [
          usdaFood('168191', 30), // medjool dates
          usdaFood('2262074', 10), // almond butter (trimmed)
        ],
      },
    ],
  },
  {
    label: 'Day 3',
    notes: '3 meals + 1 snack — apple + peanut butter',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast',
        sort_order: 0,
        foods: [
          usdaFood('748967', 150), // eggs whole large (~3)
          usdaFood('172689', 28), // whole wheat toast
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Lunch',
        sort_order: 1,
        foods: [
          usdaFood('171534', 150), // chicken breast
          usdaFood('168917', 100), // quinoa
          usdaFood('169291', 75), // zucchini
          usdaFood('2258590', 75), // bell pepper
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Dinner',
        sort_order: 2,
        foods: [
          usdaFood('171956', 170), // cod
          usdaFood('169704', 120), // brown rice
          usdaFood('168390', 100), // asparagus
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'snack',
        name: 'Apple + Peanut Butter',
        sort_order: 3,
        foods: [
          usdaFood('1105781', 150), // apple
          usdaFood('2262072', 15), // peanut butter creamy
        ],
      },
    ],
  },
  {
    label: 'Day 4',
    notes: '3 meals + 1 snack — turkey burger on sourdough; lean top sirloin dinner',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast Smoothie',
        sort_order: 0,
        foods: [
          usdaFood('330137', 150), // Greek yogurt
          usdaFood('173944', 100), // banana
          usdaFood('321359', 200), // milk 2%
          usdaFood('169640', 10), // honey
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Turkey Burger on Sourdough',
        sort_order: 1,
        foods: [
          usdaFood('330869', 140), // turkey burger 93%
          usdaFood('172675', 60), // sourdough / french bread 2 slices
          usdaFood('169249', 80), // green leaf lettuce (side salad)
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Lean Top Sirloin + Sweet Potato',
        sort_order: 2,
        foods: [
          usdaFood('168634', 140), // top sirloin lean only broiled
          usdaFood('168483', 150), // sweet potato
          usdaFood('169141', 100), // green beans
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150), // Greek yogurt
          usdaFood('167976', 15), // dark chocolate chips
          usdaFood('169640', 5), // honey
        ],
      },
    ],
  },
  {
    label: 'Day 5',
    notes:
      '3 meals + 1 snack — burrito, Mediterranean bowl (no added oil), turkey chili',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast Burrito + Coffee',
        sort_order: 0,
        foods: [
          usdaFood('174081', 50), // whole wheat tortilla
          usdaFood('172183', 100), // egg whites
          usdaFood('2644285', 50), // black beans
          usdaFood('328637', 20), // cheddar
          usdaFood('324038', 30), // salsa
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Chickpea Chicken Mediterranean Bowl',
        sort_order: 1,
        foods: [
          usdaFood('173800', 110), // chickpeas
          usdaFood('171534', 100), // chicken breast
          usdaFood('168409', 75), // cucumber
          usdaFood('170457', 75), // tomato
          usdaFood('173420', 10), // feta (trimmed)
          usdaFood('171705', 30), // avocado
          // olive oil dropped — avocado covers fat
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Turkey Chili',
        sort_order: 2,
        foods: [
          usdaFood('330869', 120), // ground turkey 93%
          usdaFood('2644285', 100), // black beans
          usdaFood('333281', 100), // diced tomatoes
          usdaFood('170000', 25), // onion
          usdaFood('2258590', 25), // bell pepper
          usdaFood('328637', 20), // cheddar
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150), // Greek yogurt
          usdaFood('171711', 40), // blueberries raw
          usdaFood('327699', 40), // strawberries
          usdaFood('169640', 8), // honey
        ],
      },
    ],
  },
  {
    label: 'Day 6',
    notes: '3 meals + 1 snack — smoothie bowl, tuna bowl, lean steak salad',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Protein Smoothie Bowl + Coffee',
        sort_order: 0,
        foods: [
          usdaFood('173944', 100), // banana
          usdaFood('330137', 150), // Greek yogurt
          usdaFood('321359', 150), // milk 2%
          usdaFood('173180', 30), // whey protein
          usdaFood('171646', 20), // granola
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Tuna Rice Bowl',
        sort_order: 1,
        foods: [
          usdaFood('334194', 130), // tuna canned water
          usdaFood('169704', 100), // brown rice
          usdaFood('168411', 50), // edamame
          usdaFood('168409', 50), // cucumber
          usdaFood('2258587', 50), // baby carrots
          soySesameDressing,
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Steak Salad',
        sort_order: 2,
        foods: [
          usdaFood('168634', 120), // top sirloin lean only
          usdaFood('169249', 200), // mixed salad greens (leaf lettuce)
          usdaFood('170457', 50), // cherry tomatoes (red ripe)
          usdaFood('171705', 50), // avocado
          balsamicVinaigrette,
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('171723', 20), // dried cranberries
          usdaFood('170567', 15), // almonds
          usdaFood('167976', 10), // dark chocolate chips
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
  .maybeSingle()

if (existingPlan) {
  mealPlanId = existingPlan.id
  console.log(`Updating existing meal plan ${mealPlanId}`)
  await supabase
    .from('meal_plans')
    .update({
      status: 'active',
      description: MEAL_PLAN_DESCRIPTION,
      client_id: null,
    })
    .eq('id', mealPlanId)
} else {
  const { data: inserted, error } = await supabase
    .from('meal_plans')
    .insert({
      coach_id: coachId,
      client_id: null,
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
    await supabase
      .from('meal_plan_meal_foods')
      .delete()
      .eq('meal_plan_meal_id', meal.id)
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
console.log('Saved as a library meal plan (assign from Nikki’s nutrition tab when ready).')
