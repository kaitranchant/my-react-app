'use client'

import * as React from 'react'

import { ClientMealPlanAssignmentCard } from '@/components/nutrition/assign-meal-plan-dialog'
import { NutritionDietaryCard } from '@/components/nutrition/nutrition-dietary-card'
import { NutritionGoalContextBanner } from '@/components/nutrition/nutrition-goal-context-banner'
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
  client: Pick<Client, 'id' | 'full_name'>
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

      <NutritionDietaryCard clientId={client.id} profile={profile} />
    </div>
  )
}
