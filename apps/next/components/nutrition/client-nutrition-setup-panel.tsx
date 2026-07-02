'use client'

import * as React from 'react'

import { ClientMealPlanAssignmentCard } from '@/components/nutrition/assign-meal-plan-dialog'
import { ShoppingListCard } from '@/components/nutrition/shopping-list-card'
import { NutritionDietaryCard } from '@/components/nutrition/nutrition-dietary-card'
import { NutritionGoalContextBanner } from '@/components/nutrition/nutrition-goal-context-banner'
import { NutritionSetupFormRequestCard } from '@/components/nutrition/nutrition-setup-form-request-card'
import {
  NutritionProfileForm,
  type NutritionProfileFormHandle,
} from '@/components/nutrition/nutrition-profile-form'
import { buildNutritionGoalContext } from '@/lib/nutrition-goal-context'
import type {
  BiologicalSex,
  Client,
  ClientGoal,
  ClientInbodyScan,
  ClientNutritionProfile,
  MealPlan,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'

type ClientNutritionSetupPanelProps = {
  client: Pick<Client, 'id' | 'full_name' | 'user_id'>
  profile: ClientNutritionProfile | null
  assignment: MealPlanAssignmentWithPlan | null
  mealPlans: Pick<MealPlan, 'id' | 'name' | 'status'>[]
  clientMealPlans?: Pick<MealPlan, 'id' | 'name' | 'status' | 'updated_at'>[]
  planDays?: MealPlanDayWithMeals[]
  goals?: ClientGoal[]
  latestScan?: ClientInbodyScan | null
  biologicalSex?: BiologicalSex | null
}

export function ClientNutritionSetupPanel({
  client,
  profile,
  assignment,
  mealPlans,
  clientMealPlans = [],
  planDays = [],
  goals = [],
  latestScan = null,
  biologicalSex = null,
}: ClientNutritionSetupPanelProps) {
  const profileFormRef = React.useRef<NutritionProfileFormHandle>(null)
  const goalContext = React.useMemo(
    () => buildNutritionGoalContext(goals, latestScan),
    [goals, latestScan]
  )

  return (
    <div className="grid gap-6">
      <NutritionSetupFormRequestCard
        clientId={client.id}
        clientName={client.full_name}
        profile={profile}
        hasPortalAccess={Boolean(client.user_id)}
      />

      {goalContext ? (
        <NutritionGoalContextBanner
          context={goalContext}
          onApplyCalorieAdjustment={
            goalContext.suggestedCalorieAdjustment != null
              ? () => profileFormRef.current?.applyGoalCalorieAdjustment()
              : undefined
          }
        />
      ) : null}

      <NutritionProfileForm
        ref={profileFormRef}
        clientId={client.id}
        profile={profile}
        goals={goals}
        latestScan={latestScan}
        biologicalSex={biologicalSex}
        hideGoalBanner
      />

      <ClientMealPlanAssignmentCard
        clientId={client.id}
        clientName={client.full_name}
        assignment={assignment}
        mealPlans={mealPlans}
        clientMealPlans={clientMealPlans}
        planDays={planDays}
        profile={profile}
      />

      <ShoppingListCard
        assignment={assignment}
        days={planDays}
        planName={assignment?.meal_plan?.name}
        audience="coach"
      />

      <NutritionDietaryCard clientId={client.id} profile={profile} />
    </div>
  )
}
