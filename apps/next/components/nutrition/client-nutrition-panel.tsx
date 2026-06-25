'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import {
  addClientFoodDiaryEntry,
  deleteClientFoodDiaryEntry,
} from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { CoachAdherenceLogCard } from '@/components/nutrition/coach-adherence-log-card'
import { ClientMealPlanAssignmentCard } from '@/components/nutrition/assign-meal-plan-dialog'
import { CoachNutritionNotesCard } from '@/components/nutrition/coach-nutrition-notes-card'
import { NutritionDietaryCard } from '@/components/nutrition/nutrition-dietary-card'
import { NutritionProfileForm } from '@/components/nutrition/nutrition-profile-form'
import { NutritionAdherenceSection } from '@/components/nutrition/nutrition-adherence-section'
import { FoodDiaryPanel } from '@/components/nutrition/food-diary-panel'
import { MacroProgressCard } from '@/components/nutrition/macro-progress-card'
import { TodaysMealsCard } from '@/components/nutrition/todays-meals-card'
import { ClientNutritionNotesCard } from '@/components/nutrition/client-nutrition-notes-card'
import { toDateKey } from '@/lib/calendar'
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
  clientMealPlans?: Pick<MealPlan, 'id' | 'name' | 'status' | 'updated_at'>[]
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
  clientMealPlans = [],
  planDays = [],
  foodDiaryEntries = [],
  goals = [],
  latestScan = null,
  biologicalSex = null,
}: ClientNutritionPanelProps) {
  const router = useRouter()
  const todayKey = toDateKey(new Date())
  const [viewedDate, setViewedDate] = React.useState(todayKey)
  const viewedLog =
    logs.find((log) => log.log_date === viewedDate) ?? null

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
        clientMealPlans={clientMealPlans}
        planDays={planDays}
        profile={profile}
      />
      <FoodDiaryPanel
        entries={foodDiaryEntries}
        readOnly
        enableDateNavigation
        onLogDateChange={setViewedDate}
        onAdd={async (entryValues) => {
          const result = await addClientFoodDiaryEntry(client.id, entryValues)
          if (result.success) router.refresh()
          return result
        }}
        onDelete={async (entryId) => {
          const result = await deleteClientFoodDiaryEntry(client.id, entryId)
          if (result.success) router.refresh()
          return result
        }}
      />
      <MacroProgressCard
        profile={profile}
        foodDiaryEntries={foodDiaryEntries}
        logDate={viewedDate}
        todayKey={todayKey}
        nutritionLog={viewedLog}
        waterMl={viewedLog?.water_ml ?? null}
        fiberG={viewedLog?.fiber_g ?? null}
      />
      <CoachAdherenceLogCard
        clientId={client.id}
        clientName={client.full_name}
        todayLog={viewedLog}
        logDate={viewedDate}
      />
      {assignment ? (
        <TodaysMealsCard
          assignment={assignment}
          days={planDays}
          todayKey={todayKey}
          profile={profile}
        />
      ) : null}
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
