'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  addFoodDiaryEntry,
  deleteFoodDiaryEntry,
  submitNutritionLog,
} from '@/app/portal/nutrition-actions'
import { PortalNutritionSetupFormCard } from '@/components/portal/portal-nutrition-setup-form-card'
import { MacroTargetsCard } from '@/components/nutrition/macro-targets-card'
import { NutritionAdherenceSelector } from '@/components/nutrition/nutrition-adherence-selector'
import { NutritionAdherenceSection } from '@/components/nutrition/nutrition-adherence-section'
import { NutritionDietarySummary } from '@/components/nutrition/nutrition-dietary-card'
import { TodaysMealsCard } from '@/components/nutrition/todays-meals-card'
import { FoodDiaryPanel } from '@/components/nutrition/food-diary-panel'
import { ClientNutritionNotesCard } from '@/components/nutrition/client-nutrition-notes-card'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toDateKey } from '@/lib/calendar'
import { isNutritionSetupFormDue } from '@/lib/nutrition-setup-form'
import {
  createEmptyNutritionLogValues,
  nutritionLogToFormValues,
} from '@/lib/nutrition'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
  MealPlanAssignment,
  MealPlanDayWithMeals,
} from 'app/types/database'

type PortalNutritionPanelProps = {
  profile: ClientNutritionProfile | null
  todayLog: ClientNutritionLog | null
  recentLogs: ClientNutritionLog[]
  assignment: MealPlanAssignment | null
  planDays: MealPlanDayWithMeals[]
  foodDiaryEntries: ClientFoodDiaryEntry[]
}

export function PortalNutritionPanel({
  profile,
  todayLog,
  recentLogs,
  assignment,
  planDays,
  foodDiaryEntries,
}: PortalNutritionPanelProps) {
  const router = useRouter()
  const todayKey = toDateKey(new Date())
  const [viewedDate, setViewedDate] = React.useState(todayKey)
  const [pending, setPending] = React.useState(false)

  const viewedLog =
    viewedDate === todayKey
      ? todayLog
      : (recentLogs.find((log) => log.log_date === viewedDate) ?? null)

  const isViewingToday = viewedDate === todayKey
  const [values, setValues] = React.useState(
    viewedLog
      ? nutritionLogToFormValues(viewedLog)
      : createEmptyNutritionLogValues(viewedDate)
  )

  React.useEffect(() => {
    setValues(
      viewedLog
        ? nutritionLogToFormValues(viewedLog)
        : createEmptyNutritionLogValues(viewedDate)
    )
  }, [viewedLog, viewedDate])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = await submitNutritionLog({
      ...values,
      logDate: viewedDate,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Nutrition log saved.')
    router.refresh()
  }

  const adherenceDateLabel = isViewingToday
    ? 'today'
    : new Date(`${viewedDate}T12:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })

  const setupFormDue = isNutritionSetupFormDue(profile)

  return (
    <div className="grid gap-6">
      {setupFormDue ? <PortalNutritionSetupFormCard profile={profile} /> : null}

      <TodaysMealsCard
        assignment={assignment}
        days={planDays}
        todayKey={todayKey}
        profile={profile}
      />

      <FoodDiaryPanel
        entries={foodDiaryEntries}
        enableDateNavigation
        profile={profile}
        nutritionLog={viewedLog}
        waterMl={values.waterMl}
        fiberG={values.fiberG}
        onLogDateChange={setViewedDate}
        onAdd={async (entryValues) => {
          const result = await addFoodDiaryEntry(entryValues)
          if (result.success) {
            router.refresh()
          } else {
            toast.error(result.error)
          }
          return result
        }}
        onDelete={async (entryId) => {
          const result = await deleteFoodDiaryEntry(entryId)
          if (result.success) {
            router.refresh()
          } else {
            toast.error(result.error)
          }
          return result
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {isViewingToday
              ? "Today's adherence"
              : `Adherence for ${adherenceDateLabel}`}
          </CardTitle>
          <CardDescription>
            {isViewingToday
              ? 'How closely did you follow your nutrition plan today?'
              : `How closely did you follow your nutrition plan on ${adherenceDateLabel}?`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <NutritionAdherenceSelector
              value={values.adherenceScore}
              onChange={(score) =>
                setValues((current) => ({
                  ...current,
                  adherenceScore: score,
                }))
              }
              disabled={pending}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nutrition-fiber">
                  Fiber{isViewingToday ? ' today' : ''} (g)
                </Label>
                <Input
                  id="nutrition-fiber"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Optional"
                  value={values.fiberG ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      fiberG:
                        event.target.value === ''
                          ? null
                          : Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nutrition-water">
                  Water{isViewingToday ? ' today' : ''} (ml)
                </Label>
                <Input
                  id="nutrition-water"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={values.waterMl ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      waterMl:
                        event.target.value === ''
                          ? null
                          : Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nutrition-client-notes">Notes (optional)</Label>
              <Textarea
                id="nutrition-client-notes"
                rows={2}
                placeholder={
                  isViewingToday
                    ? 'Anything you want your coach to know about today'
                    : 'Anything you want your coach to know about this day'
                }
                value={values.clientNotes ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    clientNotes: event.target.value || null,
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending
                  ? 'Saving…'
                  : viewedLog
                    ? 'Update log'
                    : isViewingToday
                      ? 'Log today'
                      : 'Save log'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <MacroTargetsCard profile={profile} />

      <NutritionDietarySummary profile={profile} />

      <NutritionAdherenceSection
        logs={recentLogs}
        profile={profile}
        foodDiaryEntries={foodDiaryEntries}
      />

      <ClientNutritionNotesCard
        initialNotes={profile?.client_nutrition_notes ?? null}
      />
    </div>
  )
}
