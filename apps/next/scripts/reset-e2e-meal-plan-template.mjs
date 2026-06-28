/**
 * Reset the E2E meal plan template to a single day (matches seed-e2e baseline).
 * Run: node scripts/reset-e2e-meal-plan-template.mjs
 */
import { createClient } from '@supabase/supabase-js'

import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const clientId =
  process.env.E2E_CLIENT_ID ?? 'cebb411a-1fa1-4939-ab5e-8d516d874df2'
const MEAL_PLAN_NAME = 'E2E Test Meal Plan'
const MEAL_PLAN_MEAL_NAME = 'E2E Test Breakfast'

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for meal plan reset.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: client, error: clientError } = await supabase
  .from('clients')
  .select('coach_id')
  .eq('id', clientId)
  .maybeSingle()

if (clientError || !client?.coach_id) {
  console.error('Could not resolve E2E client coach_id:', clientError?.message)
  process.exit(1)
}

const coachId = client.coach_id

await supabase.from('meal_plan_assignments').delete().eq('client_id', clientId)

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
  await supabase
    .from('meal_plans')
    .update({ status: 'active' })
    .eq('id', mealPlanId)
} else {
  const { data: inserted, error } = await supabase
    .from('meal_plans')
    .insert({
      coach_id: coachId,
      name: MEAL_PLAN_NAME,
      description: 'Automated E2E meal plan template',
      status: 'active',
    })
    .select('id')
    .single()
  if (error) throw error
  mealPlanId = inserted.id
}

const { data: existingDays } = await supabase
  .from('meal_plan_days')
  .select('id')
  .eq('meal_plan_id', mealPlanId)

for (const day of existingDays ?? []) {
  await supabase.from('meal_plan_meals').delete().eq('meal_plan_day_id', day.id)
  await supabase.from('meal_plan_days').delete().eq('id', day.id)
}

const { data: insertedDay, error: dayError } = await supabase
  .from('meal_plan_days')
  .insert({
    meal_plan_id: mealPlanId,
    day_offset: 0,
  })
  .select('id')
  .single()

if (dayError) throw dayError

const { data: existingMeal } = await supabase
  .from('meal_plan_meals')
  .select('id')
  .eq('meal_plan_day_id', insertedDay.id)
  .eq('name', MEAL_PLAN_MEAL_NAME)
  .maybeSingle()

if (!existingMeal) {
  const { error } = await supabase.from('meal_plan_meals').insert({
    meal_plan_day_id: insertedDay.id,
    sort_order: 0,
    meal_type: 'breakfast',
    name: MEAL_PLAN_MEAL_NAME,
    description: 'Oats and eggs for E2E testing',
    calories_kcal: 450,
    protein_g: 25,
    carbs_g: 50,
    fat_g: 15,
  })
  if (error) throw error
}
