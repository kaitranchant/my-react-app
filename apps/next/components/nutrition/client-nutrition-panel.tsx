'use client'

import { NutritionProfileForm } from '@/components/nutrition/nutrition-profile-form'
import { ClientMealPlanAssignmentCard } from '@/components/nutrition/assign-meal-plan-dialog'
import { CoachNutritionNotesCard } from '@/components/nutrition/coach-nutrition-notes-card'
import { NutritionDietaryCard } from '@/components/nutrition/nutrition-dietary-card'
import { NutritionAdherenceSection } from '@/components/nutrition/nutrition-adherence-section'
import { FoodDiaryPanel } from '@/components/nutrition/food-diary-panel'
import { ClientNutritionNotesCard } from '@/components/nutrition/client-nutrition-notes-card'
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

type ClientNutritionPanelProps = {
  client: Pick<Client, 'id' | 'full_name'>
  profile: ClientNutritionProfile | null
  logs: ClientNutritionLog[]
  assignment: MealPlanAssignmentWithPlan | null
  mealPlans: Pick<MealPlan, 'id' | 'name' | 'status'>[]
  planDays?: MealPlanDayWithMeals[]
  foodDiaryEntries?: ClientFoodDiaryEntry[]
  goals?: ClientGoal[]
  latestScan?: ClientInbodyScan | null
  biologicalSex?: BiologicalSex | null
}

export function ClientNutritionPanel({
  client,
  profile,
  logs,
  assignment,
  mealPlans,
  planDays = [],
  foodDiaryEntries = [],
  goals = [],
  latestScan = null,
  biologicalSex = null,
}: ClientNutritionPanelProps) {
  return (
    <div className="grid gap-6">
      <NutritionProfileForm
        clientId={client.id}
        profile={profile}
        goals={goals}
        latestScan={latestScan}
        biologicalSex={biologicalSex}
      />
      <NutritionDietaryCard clientId={client.id} profile={profile} />
      <ClientMealPlanAssignmentCard
        clientId={client.id}
        clientName={client.full_name}
        assignment={assignment}
        mealPlans={mealPlans}
        planDays={planDays}
        profile={profile}
      />
      <FoodDiaryPanel
        entries={foodDiaryEntries}
        readOnly
        enableDateNavigation
      />
      <ClientNutritionNotesCard
        initialNotes={profile?.client_nutrition_notes ?? null}
        readOnly
      />
      <NutritionAdherenceSection
        logs={logs}
        profile={profile}
        foodDiaryEntries={foodDiaryEntries}
        clientName={client.full_name}
      />
      <CoachNutritionNotesCard clientId={client.id} profile={profile} />
    </div>
  )
}
