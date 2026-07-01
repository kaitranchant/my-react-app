import { createClient } from '@/lib/supabase/server'
import {
  isMissingTableError,
  SchemaSetupNotice,
} from '@/components/library/schema-setup-notice'
import { ClientDetailNutritionSection } from '@/components/clients/client-detail-nutrition-section'
import { fetchMealPlanDaysWithMeals } from '@/lib/meal-plan-data.server'
import type {
  BiologicalSex,
  Client,
  ClientFoodDiaryEntry,
  ClientGoal,
  ClientInbodyScan,
  ClientNutritionLog,
  ClientNutritionProfile,
  MealPlan,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'

type ClientDetailNutritionPanelProps = {
  client: Pick<Client, 'id' | 'full_name' | 'user_id'>
  clientId: string
}

export async function ClientDetailNutritionPanel({
  client,
  clientId,
}: ClientDetailNutritionPanelProps) {
  const supabase = await createClient()

  const [
    nutritionProfileResult,
    nutritionLogsResult,
    mealPlanAssignmentResult,
    mealPlansResult,
    clientMealPlansResult,
    foodDiaryResult,
    goalsResult,
    inbodyResult,
    clientResult,
  ] = await Promise.all([
    supabase
      .from('client_nutrition_profiles')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle(),
    supabase
      .from('client_nutrition_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('log_date', { ascending: false })
      .limit(90),
    supabase
      .from('meal_plan_assignments')
      .select('*, meal_plan:meal_plans(id, name, description)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('meal_plans')
      .select('id, name, status')
      .is('client_id', null)
      .order('name', { ascending: true }),
    supabase
      .from('meal_plans')
      .select('id, name, status, updated_at')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('client_food_diary_entries')
      .select('*')
      .eq('client_id', clientId)
      .order('log_date', { ascending: false })
      .limit(200),
    supabase
      .from('client_goals')
      .select('*')
      .eq('client_id', clientId)
      .eq('category', 'composition'),
    supabase
      .from('client_inbody_scans')
      .select('*')
      .eq('client_id', clientId)
      .order('scan_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('clients')
      .select('biological_sex')
      .eq('id', clientId)
      .maybeSingle(),
  ])

  const nutritionProfile = (nutritionProfileResult.data ??
    null) as ClientNutritionProfile | null
  const nutritionLogs = (nutritionLogsResult.data ?? []) as ClientNutritionLog[]
  const mealPlanAssignment = mealPlanAssignmentResult.data
    ? (mealPlanAssignmentResult.data as MealPlanAssignmentWithPlan)
    : null
  const hasResolvableAssignment = Boolean(mealPlanAssignment?.meal_plan)
  const availableMealPlans = (mealPlansResult.data ?? []) as Pick<
    MealPlan,
    'id' | 'name' | 'status'
  >[]
  const clientMealPlans = (clientMealPlansResult.data ?? []) as Pick<
    MealPlan,
    'id' | 'name' | 'status' | 'updated_at'
  >[]
  const foodDiaryEntries = (foodDiaryResult.data ??
    []) as ClientFoodDiaryEntry[]
  const goals = (goalsResult.data ?? []) as ClientGoal[]
  const latestScan = (inbodyResult.data ?? null) as ClientInbodyScan | null
  const biologicalSex = (clientResult.data?.biological_sex ??
    null) as BiologicalSex | null

  const schemaError = [
    nutritionProfileResult.error,
    nutritionLogsResult.error,
    mealPlanAssignmentResult.error,
    mealPlansResult.error,
    clientMealPlansResult.error,
    foodDiaryResult.error,
  ].find((error) => error && isMissingTableError(error.message))

  if (schemaError) {
    return (
      <SchemaSetupNotice
        tables={[
          'client_nutrition_profiles',
          'client_nutrition_logs',
          'meal_plans',
        ]}
        sqlFile="apply-nutrition.sql"
      />
    )
  }

  let planDays: MealPlanDayWithMeals[] = []
  if (hasResolvableAssignment && mealPlanAssignment) {
    planDays = await fetchMealPlanDaysWithMeals(
      supabase,
      mealPlanAssignment.meal_plan_id
    )
  }

  return (
    <ClientDetailNutritionSection
      client={client}
      profile={nutritionProfile}
      logs={nutritionLogs}
      assignment={mealPlanAssignment}
      mealPlans={availableMealPlans}
      clientMealPlans={clientMealPlans}
      planDays={planDays}
      foodDiaryEntries={foodDiaryEntries}
      goals={goals}
      latestScan={latestScan}
      biologicalSex={biologicalSex}
    />
  )
}
