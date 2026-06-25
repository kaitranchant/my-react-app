'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  addFoodDiaryEntry,
  deleteFoodDiaryEntry,
  submitNutritionLog,
} from '@/app/portal/nutrition-actions'
import { MacroTargetsCard } from '@/components/nutrition/macro-targets-card'
import { NutritionAdherenceSelector } from '@/components/nutrition/nutrition-adherence-selector'
import { NutritionAdherenceSection } from '@/components/nutrition/nutrition-adherence-section'
import { NutritionDietarySummary } from '@/components/nutrition/nutrition-dietary-card'
import { TodaysMealsCard } from '@/components/nutrition/todays-meals-card'
import { FoodDiaryPanel } from '@/components/nutrition/food-diary-panel'
import { ClientNutritionNotesCard } from '@/components/nutrition/client-nutrition-notes-card'
import { MacroAdherenceBadges } from '@/components/nutrition/macro-adherence-badges'
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
import {
  buildMacroAdherenceItems,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
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
  const [pending, setPending] = React.useState(false)
  const [values, setValues] = React.useState(
    todayLog
      ? nutritionLogToFormValues(todayLog)
      : createEmptyNutritionLogValues(todayKey)
  )

  React.useEffect(() => {
    setValues(
      todayLog
        ? nutritionLogToFormValues(todayLog)
        : createEmptyNutritionLogValues(todayKey)
    )
  }, [todayLog, todayKey])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = await submitNutritionLog(values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Nutrition log saved.')
    router.refresh()
  }

  const todayFoodEntries = foodDiaryEntries.filter(
    (entry) => entry.log_date === todayKey
  )
  const todayConsumed = sumFoodDiaryMacros(todayFoodEntries)
  const todayMacroItems = buildMacroAdherenceItems(
    todayConsumed,
    profile,
    values.waterMl,
    values.fiberG
  )

  return (
    <div className="grid gap-6">
      <MacroTargetsCard profile={profile} />
      <NutritionDietarySummary profile={profile} />

      <FoodDiaryPanel
        entries={foodDiaryEntries}
        enableDateNavigation
        onAdd={async (entryValues) => {
          const result = await addFoodDiaryEntry(entryValues)
          if (result.success) router.refresh()
          return result
        }}
        onDelete={async (entryId) => {
          const result = await deleteFoodDiaryEntry(entryId)
          if (result.success) router.refresh()
          return result
        }}
      />

      {todayMacroItems.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today&apos;s macro progress</CardTitle>
            <CardDescription>
              Based on your food diary vs coach targets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MacroAdherenceBadges items={todayMacroItems} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s adherence</CardTitle>
          <CardDescription>
            How closely did you follow your nutrition plan today?
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
                <Label htmlFor="nutrition-fiber">Fiber today (g)</Label>
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
                <Label htmlFor="nutrition-water">Water today (ml)</Label>
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
                placeholder="Anything you want your coach to know about today"
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
                {pending ? 'Saving…' : todayLog ? 'Update log' : 'Log today'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ClientNutritionNotesCard
        initialNotes={profile?.client_nutrition_notes ?? null}
      />

      <TodaysMealsCard assignment={assignment} days={planDays} todayKey={todayKey} />

      <NutritionAdherenceSection
        logs={recentLogs}
        profile={profile}
        foodDiaryEntries={foodDiaryEntries}
      />
    </div>
  )
}
