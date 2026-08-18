/**
 * Copy all unique meals from Nikki Sharpsteen's current (active) meal plan
 * into the coach meal library. Skips meals that already match by food composition.
 *
 * Usage: node scripts/sync-nikki-meals-to-library.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(path) {
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv(join(__dirname, '../.env.local'))

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

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

const { data: client, error: clientError } = await admin
  .from('clients')
  .select('id, full_name, coach_id')
  .ilike('full_name', '%Nikki Sharpsteen%')
  .limit(1)
  .maybeSingle()

if (clientError || !client) {
  console.error('Client not found', clientError)
  process.exit(1)
}

console.log('Client', client.full_name, client.id)
console.log('Coach', client.coach_id)

const { data: assignment, error: assignError } = await admin
  .from('meal_plan_assignments')
  .select('id, meal_plan_id, status, meal_plan:meal_plans(id, name)')
  .eq('client_id', client.id)
  .eq('status', 'active')
  .maybeSingle()

if (assignError) {
  console.error(assignError)
  process.exit(1)
}

let planId = assignment?.meal_plan_id
let planName = assignment?.meal_plan?.name

if (!planId) {
  const { data: named } = await admin
    .from('meal_plans')
    .select('id, name')
    .eq('coach_id', client.coach_id)
    .ilike('name', '%Fat Loss 4-Day%')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  planId = named?.id
  planName = named?.name
}

if (!planId) {
  console.error('No active meal plan assignment or Fat Loss plan found')
  process.exit(1)
}

console.log('Plan', planName, planId)

const { data: days, error: daysError } = await admin
  .from('meal_plan_days')
  .select(
    `
    id,
    day_offset,
    meals:meal_plan_meals(
      id,
      name,
      description,
      meal_type,
      calories_kcal,
      protein_g,
      carbs_g,
      fat_g,
      sort_order,
      foods:meal_plan_meal_foods(
        sort_order,
        food_name,
        source,
        external_id,
        quantity_g,
        calories_kcal,
        protein_g,
        carbs_g,
        fat_g
      )
    )
  `
  )
  .eq('meal_plan_id', planId)
  .order('day_offset', { ascending: true })

if (daysError) {
  console.error(daysError)
  process.exit(1)
}

const planMeals = []
for (const day of days ?? []) {
  for (const meal of day.meals ?? []) {
    planMeals.push(meal)
  }
}

console.log('Plan meals', planMeals.length)

const { data: libraryMeals, error: libError } = await admin
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
    status,
    foods:library_meal_foods(
      sort_order,
      food_name,
      source,
      external_id,
      quantity_g,
      calories_kcal,
      protein_g,
      carbs_g,
      fat_g
    )
  `
  )
  .eq('coach_id', client.coach_id)
  .neq('status', 'archived')

if (libError) {
  console.error(libError)
  process.exit(1)
}

const existingFingerprints = new Set()
const existingByName = new Map()
for (const meal of libraryMeals ?? []) {
  const fp = mealFingerprint(meal, meal.foods ?? [])
  existingFingerprints.add(fp)
  const key = String(meal.name ?? '')
    .trim()
    .toLowerCase()
  if (!existingByName.has(key)) existingByName.set(key, [])
  existingByName.get(key).push(meal)
}

console.log('Library meals (active)', (libraryMeals ?? []).length)

const seenInPlan = new Set()
let skippedDupLibrary = 0
let skippedDupPlan = 0
let created = 0
const createdNames = []

for (const meal of planMeals) {
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

  // Also skip if same name + same food fingerprint already exists under another name casing
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

  const { data: libraryMeal, error: insertError } = await admin
    .from('library_meals')
    .insert({
      coach_id: client.coach_id,
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
    console.error('Failed to insert', meal.name, insertError)
    process.exit(1)
  }

  if (foods.length > 0) {
    const { error: foodsError } = await admin.from('library_meal_foods').insert(
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
      await admin.from('library_meals').delete().eq('id', libraryMeal.id)
      console.error('Failed foods for', meal.name, foodsError)
      process.exit(1)
    }
  }

  existingFingerprints.add(fp)
  if (!existingByName.has(nameKey)) existingByName.set(nameKey, [])
  existingByName.get(nameKey).push({ ...meal, foods, id: libraryMeal.id })
  created++
  createdNames.push(meal.name)
}

console.log(
  JSON.stringify(
    {
      plan: planName,
      planMeals: planMeals.length,
      uniqueInPlan: seenInPlan.size,
      created,
      skippedAlreadyInLibrary: skippedDupLibrary,
      skippedDuplicateWithinPlan: skippedDupPlan,
      createdNames,
    },
    null,
    2
  )
)
