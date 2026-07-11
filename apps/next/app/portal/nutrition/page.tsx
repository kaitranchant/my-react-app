import { PortalNutritionPanel } from '@/components/portal/portal-nutrition-panel'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import {
  isMissingTableError,
  SchemaSetupNotice,
} from '@/components/library/schema-setup-notice'
import { fetchMealPlanDaysWithMeals } from '@/lib/meal-plan-data.server'
import { getPortalClientContext } from '@/lib/portal-client'
import { toDateKey } from '@/lib/calendar'
import { createClient } from '@/lib/supabase/server'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'

export const metadata = {
  title: 'Nutrition — Coaching App',
}

export default async function PortalNutritionPage() {
  const supabase = await createClient()
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let profile: ClientNutritionProfile | null = null
  let todayLog: ClientNutritionLog | null = null
  let recentLogs: ClientNutritionLog[] = []
  let assignment: MealPlanAssignmentWithPlan | null = null
  let planDays: MealPlanDayWithMeals[] = []
  let foodDiaryEntries: ClientFoodDiaryEntry[] = []
  let checkedFoodKeys: string[] = []
  let nutritionSchemaError: string | null = null
  let needsFoodLibrarySql = false

  if (clientRecord?.id) {
    const todayKey = toDateKey(new Date())

    const [
      profileResult,
      todayLogResult,
      logsResult,
      assignmentResult,
      foodDiaryResult,
    ] = await Promise.all([
      supabase
        .from('client_nutrition_profiles')
        .select('*')
        .eq('client_id', clientRecord.id)
        .maybeSingle(),
      supabase
        .from('client_nutrition_logs')
        .select('*')
        .eq('client_id', clientRecord.id)
        .eq('log_date', todayKey)
        .maybeSingle(),
      supabase
        .from('client_nutrition_logs')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('log_date', { ascending: false })
        .limit(90),
      supabase
        .from('meal_plan_assignments')
        .select('*, meal_plan:meal_plans(id, name, description)')
        .eq('client_id', clientRecord.id)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('client_food_diary_entries')
        .select('*')
        .eq('client_id', clientRecord.id)
        .order('log_date', { ascending: false })
        .limit(200),
    ])

    profile = (profileResult.data ?? null) as ClientNutritionProfile | null
    todayLog = (todayLogResult.data ?? null) as ClientNutritionLog | null
    recentLogs = (logsResult.data ?? []) as ClientNutritionLog[]
    assignment = (assignmentResult.data ?? null) as MealPlanAssignmentWithPlan | null
    foodDiaryEntries = (foodDiaryResult.data ?? []) as ClientFoodDiaryEntry[]

    nutritionSchemaError = [
      profileResult.error,
      todayLogResult.error,
      logsResult.error,
      assignmentResult.error,
      foodDiaryResult.error,
    ].find((error) => error && isMissingTableError(error.message))?.message ?? null

    needsFoodLibrarySql = Boolean(
      foodDiaryResult.error && isMissingTableError(foodDiaryResult.error.message)
    )

    if (assignment) {
      planDays = await fetchMealPlanDaysWithMeals(supabase, assignment.meal_plan_id)

      const checksResult = await supabase
        .from('client_shopping_list_checks')
        .select('food_key')
        .eq('client_id', clientRecord.id)
        .eq('meal_plan_assignment_id', assignment.id)

      if (!checksResult.error) {
        checkedFoodKeys = (checksResult.data ?? []).map((row) => row.food_key)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Nutrition</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Log daily adherence and review your meal plan, shopping list, targets,
          and coach preferences.
        </p>
      </section>

      {!clientRecord ? (
        <PortalUnlinkedState feature="track nutrition" />
      ) : nutritionSchemaError ? (
        <SchemaSetupNotice
          tables={[
            'client_nutrition_profiles',
            'client_nutrition_logs',
            'client_food_diary_entries',
            'meal_plans',
            'meal_plan_assignments',
            'meal_plan_meal_foods',
          ]}
          sqlFile="apply-nutrition.sql"
          additionalSqlFiles={
            needsFoodLibrarySql ? ['apply-food-library.sql'] : []
          }
        />
      ) : (
        <PortalNutritionPanel
          profile={profile}
          defaultBiologicalSex={clientRecord.biological_sex}
          todayLog={todayLog}
          recentLogs={recentLogs}
          assignment={assignment}
          planDays={planDays}
          foodDiaryEntries={foodDiaryEntries}
          checkedFoodKeys={checkedFoodKeys}
        />
      )}
    </div>
  )
}
