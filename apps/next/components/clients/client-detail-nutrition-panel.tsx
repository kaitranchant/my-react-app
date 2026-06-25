import { createClient } from '@/lib/supabase/server'
import { ClientNutritionPanel } from '@/components/nutrition/client-nutrition-panel'
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
  client: Pick<Client, 'id' | 'full_name'>
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
  const availableMealPlans = (mealPlansResult.data ?? []) as Pick<
    MealPlan,
    'id' | 'name' | 'status'
  >[]
  const foodDiaryEntries = (foodDiaryResult.data ??
    []) as ClientFoodDiaryEntry[]
  const goals = (goalsResult.data ?? []) as ClientGoal[]
  const latestScan = (inbodyResult.data ?? null) as ClientInbodyScan | null
  const biologicalSex = (clientResult.data?.biological_sex ??
    null) as BiologicalSex | null

  let planDays: MealPlanDayWithMeals[] = []
  if (mealPlanAssignment) {
    planDays = await fetchMealPlanDaysWithMeals(
      supabase,
      mealPlanAssignment.meal_plan_id
    )
  }

  return (
    <ClientNutritionPanel
      client={client}
      profile={nutritionProfile}
      logs={nutritionLogs}
      assignment={mealPlanAssignment}
      mealPlans={availableMealPlans}
      planDays={planDays}
      foodDiaryEntries={foodDiaryEntries}
      goals={goals}
      latestScan={latestScan}
      biologicalSex={biologicalSex}
    />
  )
}
