'use client'

import { NutritionLogList } from '@/components/nutrition/nutrition-log-list'
import { NutritionProfileForm } from '@/components/nutrition/nutrition-profile-form'
import { NutritionTrendsChart } from '@/components/nutrition/nutrition-trends-chart'
import { ClientMealPlanAssignmentCard } from '@/components/nutrition/assign-meal-plan-dialog'
import { NutritionDietaryCard } from '@/components/nutrition/nutrition-dietary-card'
import { FoodDiaryPanel } from '@/components/nutrition/food-diary-panel'
import { ClientNutritionNotesCard } from '@/components/nutrition/client-nutrition-notes-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toDateKey } from '@/lib/calendar'
import {
  buildMacroAdherenceItems,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
import { buildNutritionTrendPoints } from '@/lib/nutrition-trends'
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
  const macroItemsByDate = new Map<string, ReturnType<typeof buildMacroAdherenceItems>>()

  const entriesByDate = new Map<string, ClientFoodDiaryEntry[]>()
  for (const entry of foodDiaryEntries) {
    const existing = entriesByDate.get(entry.log_date) ?? []
    existing.push(entry)
    entriesByDate.set(entry.log_date, existing)
  }

  for (const log of logs) {
    const dayEntries = entriesByDate.get(log.log_date) ?? []
    const consumed = sumFoodDiaryMacros(dayEntries)
    macroItemsByDate.set(
      log.log_date,
      buildMacroAdherenceItems(consumed, profile, log.water_ml, log.fiber_g)
    )
  }

  const trendPoints = buildNutritionTrendPoints(logs, 7, macroItemsByDate)
  const todayKey = toDateKey(new Date())

  return (
    <div className="grid gap-6">
      <NutritionProfileForm
        clientId={client.id}
        profile={profile}
        goals={goals}
        latestScan={latestScan}
        biologicalSex={biologicalSex}
      />
      <NutritionDietaryCard profile={profile} />
      <ClientMealPlanAssignmentCard
        clientId={client.id}
        clientName={client.full_name}
        assignment={assignment}
        mealPlans={mealPlans}
        planDays={planDays}
      />
      <FoodDiaryPanel
        entries={foodDiaryEntries}
        logDate={todayKey}
        readOnly
      />
      <ClientNutritionNotesCard
        initialNotes={profile?.client_nutrition_notes ?? null}
        readOnly
      />
      <Card>
        <CardHeader>
          <CardTitle>7-day adherence trend</CardTitle>
          <CardDescription>
            Daily nutrition adherence scores from {client.full_name}. Green = on
            track, amber = partial, red = off plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NutritionTrendsChart points={trendPoints} />
        </CardContent>
      </Card>
      <NutritionLogList
        logs={logs}
        profile={profile}
        foodDiaryEntries={foodDiaryEntries}
      />
    </div>
  )
}
