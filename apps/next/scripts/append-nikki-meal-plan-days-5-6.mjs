/**
 * Append Days 5–6 from nikki-4-day-meal-planupdated.md to Nikki's meal plan.
 * Does not wipe existing days.
 *
 * Run: node scripts/append-nikki-meal-plan-days-5-6.mjs
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

const daysToAppend = [
  {
    day_offset: 4,
    label: 'Day 5',
    notes: '3 meals + 1 snack — breakfast burrito, Mediterranean lunch, turkey chili',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Breakfast Burrito + Coffee',
        sort_order: 0,
        foods: [
          usdaFood('174081', 50), // whole wheat tortilla
          usdaFood('172183', 100), // egg white
          usdaFood('2644285', 50), // black beans drained
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
          usdaFood('173800', 150), // chickpeas canned drained
          usdaFood('171534', 100), // chicken breast grilled
          usdaFood('168409', 75), // cucumber
          usdaFood('170457', 75), // tomato
          usdaFood('173420', 30), // feta
          usdaFood('171413', 7), // olive oil
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
          usdaFood('2258590', 25), // red bell pepper
          usdaFood('328637', 20), // cheddar
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150), // Greek yogurt nonfat
          usdaFood('173948', 40), // blueberries
          usdaFood('327699', 40), // strawberries
          usdaFood('169640', 8), // honey
        ],
      },
    ],
  },
  {
    day_offset: 5,
    label: 'Day 6',
    notes: '3 meals + 1 snack — smoothie bowl, tuna bowl, pork tenderloin',
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
          usdaFood('171646', 20), // granola homemade
          creamerServing,
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Tuna Rice Bowl',
        sort_order: 1,
        foods: [
          usdaFood('334194', 130), // tuna canned water
          usdaFood('169704', 100), // brown rice cooked
          usdaFood('168411', 50), // edamame prepared
          usdaFood('168409', 50), // cucumber
          usdaFood('2258587', 50), // baby carrots
          soySesameDressing,
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Pork Tenderloin + Sweet Potato',
        sort_order: 2,
        foods: [
          usdaFood('168250', 170), // pork tenderloin roasted lean
          usdaFood('168483', 150), // sweet potato baked
          usdaFood('169141', 100), // green beans
        ],
      },
      {
        meal_type: 'snack',
        name: 'Snack (sweet)',
        sort_order: 3,
        foods: [
          usdaFood('171723', 20), // dried cranberries
          usdaFood('170562', 15), // sunflower seeds dried
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

// Prefer the client-linked active plan; fall back to library template.
const { data: clientPlan } = await supabase
  .from('meal_plans')
  .select('id, name, client_id')
  .eq('coach_id', coachId)
  .eq('client_id', client.id)
  .ilike('name', '%Nikki%Fat Loss%')
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

const mealPlan = clientPlan ?? libraryPlan
if (!mealPlan) {
  console.error('Could not find Nikki meal plan.')
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

await supabase
  .from('meal_plans')
  .update({
    description:
      '6-day fat loss meal plan (~1,450 kcal/day target). Client: 136 lbs, sedentary job, 2x/week resistance training. Includes sweet snacks daily. Days 5–6 add Mediterranean / Tex-Mex / Asian variety.',
  })
  .eq('id', mealPlanId)

for (const day of daysToAppend) {
  if (existingOffsets.has(day.day_offset)) {
    console.log(`Skipping ${day.label} — day_offset ${day.day_offset} already exists`)
    continue
  }

  const { data: insertedDay, error: dayError } = await supabase
    .from('meal_plan_days')
    .insert({
      meal_plan_id: mealPlanId,
      day_offset: day.day_offset,
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
    `Added ${day.label}: ${dayTotals.calories_kcal} kcal · ${dayTotals.protein_g} P · ${dayTotals.fat_g} F · ${dayTotals.carbs_g} C`
  )
}

console.log(`\nDone. Open /library/meal-plans/${mealPlanId}`)
