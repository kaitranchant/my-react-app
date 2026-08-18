/**
 * Create "Liz McIntosh Fat Loss 4-Day August 2026" from
 * liz-4-day-meal-plan.md and copy the named meals into the meal library.
 *
 * Run: node scripts/import-liz-meal-plan-aug-2026.mjs
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
const MEAL_PLAN_DESCRIPTION =
  '4-day fat loss meal plan (~1,850 kcal · ~140g P · ~62g F · ~184g C · under 30g fiber). IBS-friendly, Aldi-friendly, uses freezer ground beef. Includes her required vanilla PB2 smoothie and taco bowl. No kale, venison, or raw tomato.'

const NUTRITION_TARGETS = {
  calories_kcal: 1850,
  protein_g: 140,
  carbs_g: 184,
  fat_g: 62,
  fiber_g: 30,
}

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

// Orgain Organic Protein Powder, vanilla — 1 serving (label: 2 scoops / 46g)
const orgainScoop = customFood('Orgain Organic Protein Powder, vanilla', 46, {
  caloriesKcal: 150,
  proteinG: 21,
  carbsG: 15,
  fatG: 4,
})

function pb2(tablespoons) {
  const quantityG = roundMacro(tablespoons * 6)
  return customFood('PB2 Pure Peanut Powder', quantityG, {
    caloriesKcal: roundMacro(tablespoons * 30),
    proteinG: roundMacro(tablespoons * 3),
    carbsG: roundMacro(tablespoons * 2.5),
    fatG: roundMacro(tablespoons * 0.75),
  })
}

const almondMilkCup = usdaFood('1750338', 240) // unsweetened almond milk, 1 cup
const sauteedPepperZucchini = [
  usdaFood('169291', 50), // zucchini
  usdaFood('2258590', 50), // red bell pepper
]

const mealPlanDays = [
  {
    label: 'Day 1',
    notes:
      '3 meals + 1 snack. Required vanilla PB2 smoothie. Uses freezer ground beef at dinner.',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Vanilla PB2 Smoothie',
        sort_order: 0,
        foods: [
          orgainScoop,
          pb2(2),
          usdaFood('173944', 118), // banana
          almondMilkCup,
          usdaFood('170554', 12), // chia 1 tbsp
          usdaFood('171893', 5), // instant coffee / espresso powder
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Chicken + Rice',
        sort_order: 1,
        foods: [
          usdaFood('171534', 170), // grilled chicken breast
          usdaFood('168878', 120), // white rice cooked
          ...sauteedPepperZucchini,
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Beef + Rice + Green Beans',
        sort_order: 2,
        foods: [
          usdaFood('171794', 150), // 90/10 ground beef, pan-browned
          usdaFood('168878', 150), // white rice cooked
          usdaFood('169141', 100), // green beans
          usdaFood('171413', 7), // olive oil
          usdaFood('328637', 15), // cheddar
        ],
      },
      {
        meal_type: 'snack',
        name: 'Yogurt + Honey + Chocolate',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150), // Greek yogurt nonfat
          usdaFood('169640', 15), // honey
          usdaFood('167976', 20), // dark chocolate chips
        ],
      },
    ],
  },
  {
    label: 'Day 2',
    notes:
      '3 meals + 1 snack. Fat runs a bit high from salmon + avocado — trim lunch olive oil if needed.',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Cocoa Protein Oats',
        sort_order: 0,
        foods: [
          usdaFood('2346396', 30), // rolled oats dry
          orgainScoop,
          usdaFood('169593', 5), // cocoa unsweetened
          almondMilkCup,
          usdaFood('173944', 100), // banana
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Salmon + Rice + Avocado',
        sort_order: 1,
        foods: [
          usdaFood('175168', 170), // salmon cooked
          usdaFood('168878', 150), // white rice cooked
          usdaFood('168390', 100), // asparagus cooked
          usdaFood('171705', 50), // avocado
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Turkey + Rice + Veg',
        sort_order: 2,
        foods: [
          usdaFood('330869', 180), // 93% ground turkey cooked
          usdaFood('168878', 120), // white rice cooked
          ...sauteedPepperZucchini,
          usdaFood('171247', 15), // parmesan
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'snack',
        name: 'Chocolate Yogurt',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150), // Greek yogurt nonfat
          usdaFood('169593', 5), // cocoa
          usdaFood('169640', 10), // honey
          usdaFood('167976', 10), // dark chocolate chips
        ],
      },
    ],
  },
  {
    label: 'Day 3',
    notes:
      '3 meals + 1 snack. Required taco bowl. Highest-fiber day (beans + rice + veg) — keep breakfast and dinner lower-fiber.',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Yogurt + PB2 + Banana',
        sort_order: 0,
        foods: [
          usdaFood('330137', 200), // Greek yogurt nonfat
          pb2(2),
          usdaFood('173944', 100), // banana
          usdaFood('169640', 10), // honey
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Taco Bowl',
        sort_order: 1,
        foods: [
          usdaFood('171794', 140), // 90/10 ground beef
          usdaFood('168878', 150), // white rice cooked
          usdaFood('2644285', 75), // black beans drained
          usdaFood('2258590', 50), // bell pepper
          usdaFood('170000', 50), // onion
          usdaFood('172243', 5), // taco seasoning
          usdaFood('328637', 20), // cheddar
          usdaFood('171705', 50), // avocado
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Cod + Rice + Green Beans',
        sort_order: 2,
        foods: [
          usdaFood('171956', 170), // baked cod
          usdaFood('168878', 120), // white rice cooked
          usdaFood('169141', 80), // green beans
          usdaFood('171413', 14), // olive oil
        ],
      },
      {
        meal_type: 'snack',
        name: 'Cocoa Protein Shake',
        sort_order: 3,
        foods: [
          orgainScoop,
          usdaFood('169593', 5), // cocoa
          almondMilkCup,
          usdaFood('169640', 10), // honey
        ],
      },
    ],
  },
  {
    label: 'Day 4',
    notes:
      '3 meals + 1 snack. Overnight cocoa chia pudding is a Sunday prep option.',
    meals: [
      {
        meal_type: 'breakfast',
        name: 'Overnight Cocoa Chia Pudding',
        sort_order: 0,
        foods: [
          usdaFood('170554', 12), // chia 1 tbsp
          almondMilkCup,
          usdaFood('169593', 5), // cocoa
          orgainScoop,
          usdaFood('169640', 10), // honey
          usdaFood('173944', 100), // banana
        ],
      },
      {
        meal_type: 'lunch',
        name: 'Chicken Fajita Bowl',
        sort_order: 1,
        foods: [
          usdaFood('171534', 150), // grilled chicken breast
          usdaFood('168878', 120), // white rice cooked
          usdaFood('2258590', 75), // bell pepper
          usdaFood('170000', 75), // onion
          usdaFood('328637', 15), // cheddar
          usdaFood('171413', 7), // olive oil
        ],
      },
      {
        meal_type: 'dinner',
        name: 'Salmon + Quinoa + Asparagus',
        sort_order: 2,
        foods: [
          usdaFood('175168', 170), // salmon cooked
          usdaFood('168917', 150), // quinoa cooked
          usdaFood('168390', 100), // asparagus
          usdaFood('171413', 5), // olive oil
        ],
      },
      {
        meal_type: 'snack',
        name: 'Yogurt + PB2 + Chocolate',
        sort_order: 3,
        foods: [
          usdaFood('330137', 150), // Greek yogurt nonfat
          pb2(1),
          usdaFood('167976', 10), // dark chocolate chips
          usdaFood('169640', 8), // honey
        ],
      },
    ],
  },
  {
    label: 'Day 5',
    notes: 'Lunch only — Buffalo Bowls.',
    meals: [
      {
        meal_type: 'lunch',
        name: 'Buffalo Bowls',
        sort_order: 0,
        foods: [
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
  .select('id, coach_id, full_name')
  .ilike('full_name', `%${CLIENT_NAME}%`)
  .maybeSingle()

if (clientError || !client?.coach_id) {
  console.error('Could not find client:', clientError?.message ?? 'no row')
  process.exit(1)
}

const coachId = client.coach_id
console.log('Client', client.full_name, client.id)
console.log('Coach', coachId)

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

const insertedPlanMeals = []

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

    insertedPlanMeals.push({
      name: meal.name,
      meal_type: meal.meal_type,
      description: null,
      calories_kcal: totals.calories_kcal,
      protein_g: totals.protein_g,
      carbs_g: totals.carbs_g,
      fat_g: totals.fat_g,
      foods: foodRows,
    })
  }

  const dayTotals = sumFoodMacros(day.meals.flatMap((meal) => meal.foods))
  console.log(
    `${day.label}: ${dayTotals.calories_kcal} kcal · ${dayTotals.protein_g} P · ${dayTotals.fat_g} F · ${dayTotals.carbs_g} C`
  )
}

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

const existingFingerprints = new Set()
const existingByName = new Map()
for (const meal of libraryMeals ?? []) {
  existingFingerprints.add(mealFingerprint(meal, meal.foods ?? []))
  const key = String(meal.name ?? '')
    .trim()
    .toLowerCase()
  if (!existingByName.has(key)) existingByName.set(key, [])
  existingByName.get(key).push(meal)
}

const seenInPlan = new Set()
let skippedDupLibrary = 0
let skippedDupPlan = 0
let created = 0
const createdNames = []

for (const meal of insertedPlanMeals) {
  const foods = meal.foods ?? []
  const fp = mealFingerprint(meal, foods)

  if (seenInPlan.has(fp)) {
    skippedDupPlan++
    continue
  }
  seenInPlan.add(fp)

  if (existingFingerprints.has(fp)) {
    skippedDupLibrary++
    continue
  }

  const nameKey = String(meal.name ?? '')
    .trim()
    .toLowerCase()
  const nameMatches = existingByName.get(nameKey) ?? []
  const nameFoodMatch = nameMatches.some(
    (m) => foodFingerprint(m.foods ?? []) === foodFingerprint(foods)
  )
  if (nameFoodMatch) {
    skippedDupLibrary++
    continue
  }

  const { data: libraryMeal, error: insertError } = await supabase
    .from('library_meals')
    .insert({
      coach_id: coachId,
      name: meal.name,
      description: meal.description,
      meal_type: meal.meal_type,
      status: 'active',
      calories_kcal: meal.calories_kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    })
    .select('id')
    .single()

  if (insertError || !libraryMeal) {
    console.error('Failed to insert library meal', meal.name, insertError)
    process.exit(1)
  }

  if (foods.length > 0) {
    const { error: foodsError } = await supabase.from('library_meal_foods').insert(
      foods.map((food) => ({
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
  }

  existingFingerprints.add(fp)
  created++
  createdNames.push(meal.name)
}

console.log(
  JSON.stringify(
    {
      plan: MEAL_PLAN_NAME,
      mealPlanId,
      planMeals: insertedPlanMeals.length,
      uniqueInPlan: seenInPlan.size,
      createdLibraryMeals: created,
      skippedAlreadyInLibrary: skippedDupLibrary,
      skippedDuplicateWithinPlan: skippedDupPlan,
      createdNames,
    },
    null,
    2
  )
)

const { data: existingProfile } = await supabase
  .from('client_nutrition_profiles')
  .select('client_id')
  .eq('client_id', client.id)
  .maybeSingle()

if (existingProfile) {
  const { error: targetError } = await supabase
    .from('client_nutrition_profiles')
    .update(NUTRITION_TARGETS)
    .eq('client_id', client.id)
  if (targetError) throw targetError
} else {
  const { error: targetError } = await supabase
    .from('client_nutrition_profiles')
    .insert({
      client_id: client.id,
      coach_id: coachId,
      ...NUTRITION_TARGETS,
    })
  if (targetError) throw targetError
}

console.log(
  `Set nutrition targets: ${NUTRITION_TARGETS.calories_kcal} kcal · ${NUTRITION_TARGETS.protein_g}g P · ${NUTRITION_TARGETS.fat_g}g F · ${NUTRITION_TARGETS.carbs_g}g C · ${NUTRITION_TARGETS.fiber_g}g fiber`
)
console.log(`\nDone. Meal plan: /library/meal-plans/${mealPlanId}`)
console.log('Saved as a library meal plan (assign from Liz’s nutrition tab when ready).')
