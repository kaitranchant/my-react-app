'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  addClientFoodDiaryEntry,
  deleteClientFoodDiaryEntry,
} from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { CoachAdherenceLogCard } from '@/components/nutrition/coach-adherence-log-card'
import { CoachNutritionNotesCard } from '@/components/nutrition/coach-nutrition-notes-card'
import { NutritionAdherenceSection } from '@/components/nutrition/nutrition-adherence-section'
import { FoodDiaryPanel } from '@/components/nutrition/food-diary-panel'
import { ShoppingListCard } from '@/components/nutrition/shopping-list-card'
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
  const [viewedDate, setViewedDate] = React.useState(todayKey)
  const [adherenceDraft, setAdherenceDraft] = React.useState<{
    waterMl: number | null
    fiberG: number | null
  } | null>(null)
  const viewedLog =
    logs.find((log) => log.log_date === viewedDate) ?? null

  React.useEffect(() => {
    setAdherenceDraft(null)
  }, [viewedDate])

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

  return (
    <div className="grid gap-6">
      <TodaysMealsCard
        assignment={assignment}
        days={planDays}
        todayKey={todayKey}
        profile={profile}
        audience="coach"
      />

      <ShoppingListCard
        assignment={assignment}
        days={planDays}
        planName={assignment?.meal_plan?.name}
        audience="coach"
      />

      <FoodDiaryPanel
        entries={foodDiaryEntries}
        readOnly
        enableDateNavigation
        profile={profile}
        nutritionLog={viewedLog}
        waterMl={adherenceDraft?.waterMl ?? viewedLog?.water_ml ?? null}
        fiberG={adherenceDraft?.fiberG ?? viewedLog?.fiber_g ?? null}
        onLogDateChange={setViewedDate}
        onAdd={async (entryValues) => {
          const result = await addClientFoodDiaryEntry(client.id, entryValues)
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
        todayLog={viewedLog}
        logDate={viewedDate}
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
