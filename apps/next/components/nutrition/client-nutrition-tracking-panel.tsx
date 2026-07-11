'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  addClientFoodDiaryEntry,
  addClientFoodDiaryEntries,
  deleteClientFoodDiaryEntry,
} from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { CoachAdherenceLogCard } from '@/components/nutrition/coach-adherence-log-card'
import { CoachNutritionNotesCard } from '@/components/nutrition/coach-nutrition-notes-card'
import { NutritionAdherenceSection } from '@/components/nutrition/nutrition-adherence-section'
import { FoodDiaryPanel } from '@/components/nutrition/food-diary-panel'
import { TodaysMealsCard } from '@/components/nutrition/todays-meals-card'
import { ClientNutritionNotesCard } from '@/components/nutrition/client-nutrition-notes-card'
import { toDateKey } from '@/lib/calendar'
import type {
  Client,
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'

type ClientNutritionTrackingPanelProps = {
  client: Pick<Client, 'id' | 'full_name'>
  profile: ClientNutritionProfile | null
  logs: ClientNutritionLog[]
  assignment: MealPlanAssignmentWithPlan | null
  planDays?: MealPlanDayWithMeals[]
  foodDiaryEntries?: ClientFoodDiaryEntry[]
}

export function ClientNutritionTrackingPanel({
  client,
  profile,
  logs,
  assignment,
  planDays = [],
  foodDiaryEntries = [],
}: ClientNutritionTrackingPanelProps) {
  const router = useRouter()
  const todayKey = toDateKey(new Date())
  const [foodDiaryDate, setFoodDiaryDate] = React.useState(todayKey)
  const [adherenceDate, setAdherenceDate] = React.useState(todayKey)
  const [adherenceDraft, setAdherenceDraft] = React.useState<{
    waterMl: number | null
    fiberG: number | null
  } | null>(null)
  const foodDiaryLog =
    logs.find((log) => log.log_date === foodDiaryDate) ?? null
  const adherenceLog =
    logs.find((log) => log.log_date === adherenceDate) ?? null

  React.useEffect(() => {
    setAdherenceDraft(null)
  }, [adherenceDate])

  const handleAdherenceValuesChange = React.useCallback(
    (values: { waterMl: number | null; fiberG: number | null }) => {
      setAdherenceDraft((current) => {
        if (
          current?.waterMl === values.waterMl &&
          current?.fiberG === values.fiberG
        ) {
          return current
        }

        return {
          waterMl: values.waterMl,
          fiberG: values.fiberG,
        }
      })
    },
    []
  )

  const foodDiaryWaterMl =
    adherenceDate === foodDiaryDate
      ? (adherenceDraft?.waterMl ?? foodDiaryLog?.water_ml ?? null)
      : (foodDiaryLog?.water_ml ?? null)
  const foodDiaryFiberG =
    adherenceDate === foodDiaryDate
      ? (adherenceDraft?.fiberG ?? foodDiaryLog?.fiber_g ?? null)
      : (foodDiaryLog?.fiber_g ?? null)

  return (
    <div className="grid gap-6">
      <TodaysMealsCard
        assignment={assignment}
        days={planDays}
        todayKey={todayKey}
        profile={profile}
        audience="coach"
      />

      <FoodDiaryPanel
        entries={foodDiaryEntries}
        logDate={foodDiaryDate}
        readOnly
        enableDateNavigation
        profile={profile}
        nutritionLog={foodDiaryLog}
        waterMl={foodDiaryWaterMl}
        fiberG={foodDiaryFiberG}
        assignment={assignment}
        planDays={planDays}
        onLogDateChange={setFoodDiaryDate}
        onAdd={async (entryValues) => {
          const result = await addClientFoodDiaryEntry(client.id, entryValues)
          if (result.success) {
            router.refresh()
          } else {
            toast.error(result.error)
          }
          return result
        }}
        onAddMany={async (entryValues) => {
          const result = await addClientFoodDiaryEntries(client.id, entryValues)
          if (result.success) {
            router.refresh()
          } else {
            toast.error(result.error)
          }
          return result
        }}
        onDelete={async (entryId) => {
          const result = await deleteClientFoodDiaryEntry(client.id, entryId)
          if (result.success) {
            router.refresh()
          } else {
            toast.error(result.error)
          }
          return result
        }}
      />

      <CoachAdherenceLogCard
        clientId={client.id}
        clientName={client.full_name}
        todayLog={adherenceLog}
        logDate={adherenceDate}
        onLogDateChange={setAdherenceDate}
        onValuesChange={handleAdherenceValuesChange}
      />

      <NutritionAdherenceSection
        logs={logs}
        profile={profile}
        foodDiaryEntries={foodDiaryEntries}
        clientName={client.full_name}
      />

      <ClientNutritionNotesCard
        initialNotes={profile?.client_nutrition_notes ?? null}
        readOnly
      />

      <CoachNutritionNotesCard clientId={client.id} profile={profile} />
    </div>
  )
}
