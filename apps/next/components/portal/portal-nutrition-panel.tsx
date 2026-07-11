'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import {
  addFoodDiaryEntry,
  addFoodDiaryEntries,
  deleteFoodDiaryEntry,
  submitNutritionLog,
  toggleShoppingListCheck,
  updateShoppingListCycles,
} from '@/app/portal/nutrition-actions'
import { PortalNutritionSetupFormCard } from '@/components/portal/portal-nutrition-setup-form-card'
import { MacroTargetsCard } from '@/components/nutrition/macro-targets-card'
import { NutritionAdherenceSelector } from '@/components/nutrition/nutrition-adherence-selector'
import { NutritionAdherenceSection } from '@/components/nutrition/nutrition-adherence-section'
import { NutritionDietarySummary } from '@/components/nutrition/nutrition-dietary-card'
import { ShoppingListCard } from '@/components/nutrition/shopping-list-card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toDateKey } from '@/lib/calendar'
import { isNutritionSetupFormDue } from '@/lib/nutrition-setup-form'
import {
  createEmptyNutritionLogValues,
  nutritionLogToFormValues,
} from '@/lib/nutrition'
import type {
  BiologicalSex,
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'

const PORTAL_NUTRITION_SECTIONS = ['adherence', 'plan', 'shopping'] as const
export type PortalNutritionSection = (typeof PORTAL_NUTRITION_SECTIONS)[number]

export function resolvePortalNutritionSection(
  section: string | null
): PortalNutritionSection {
  if (section && PORTAL_NUTRITION_SECTIONS.includes(section as PortalNutritionSection)) {
    return section as PortalNutritionSection
  }
  return 'adherence'
}

function buildPortalNutritionSectionUrl(
  pathname: string,
  section: PortalNutritionSection,
  searchParams: URLSearchParams
) {
  const params = new URLSearchParams(searchParams.toString())
  if (section === 'adherence') {
    params.delete('section')
  } else {
    params.set('section', section)
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

type PortalNutritionPanelProps = {
  profile: ClientNutritionProfile | null
  defaultBiologicalSex?: BiologicalSex | null
  todayLog: ClientNutritionLog | null
  recentLogs: ClientNutritionLog[]
  assignment: MealPlanAssignmentWithPlan | null
  planDays: MealPlanDayWithMeals[]
  foodDiaryEntries: ClientFoodDiaryEntry[]
  checkedFoodKeys: string[]
}

export function PortalNutritionPanel({
  profile,
  defaultBiologicalSex = null,
  todayLog,
  recentLogs,
  assignment,
  planDays,
  foodDiaryEntries,
  checkedFoodKeys,
}: PortalNutritionPanelProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlSection = searchParams.get('section')
  const [nutritionSection, setNutritionSection] =
    React.useState<PortalNutritionSection>(() =>
      resolvePortalNutritionSection(urlSection)
    )
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
    setNutritionSection(resolvePortalNutritionSection(urlSection))
  }, [urlSection])

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

  function handleNutritionSectionChange(value: string) {
    const section = value as PortalNutritionSection
    setNutritionSection(section)
    router.replace(
      buildPortalNutritionSectionUrl(pathname, section, searchParams),
      { scroll: false }
    )
  }

  return (
    <Tabs
      value={nutritionSection}
      onValueChange={handleNutritionSectionChange}
      variant="filter"
    >
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="w-max flex-nowrap">
          <TabsTrigger value="adherence" size="sm">
            Adherence
          </TabsTrigger>
          <TabsTrigger value="plan" size="sm">
            Your plan
          </TabsTrigger>
          <TabsTrigger value="shopping" size="sm">
            Shopping
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="adherence" className="mt-4 grid gap-4">
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
              <div className="grid grid-cols-2 gap-3">
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

        <FoodDiaryPanel
          entries={foodDiaryEntries}
          enableDateNavigation
          profile={profile}
          nutritionLog={viewedLog}
          waterMl={values.waterMl}
          fiberG={values.fiberG}
          assignment={assignment}
          planDays={planDays}
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
          onAddMany={async (entryValues) => {
            const result = await addFoodDiaryEntries(entryValues)
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

        <NutritionAdherenceSection
          logs={recentLogs}
          profile={profile}
          foodDiaryEntries={foodDiaryEntries}
        />
      </TabsContent>

      <TabsContent value="plan" className="mt-4 grid gap-4">
        {setupFormDue ? (
          <PortalNutritionSetupFormCard
            profile={profile}
            defaultBiologicalSex={defaultBiologicalSex}
          />
        ) : null}

        <TodaysMealsCard
          assignment={assignment}
          days={planDays}
          todayKey={todayKey}
          profile={profile}
        />

        <MacroTargetsCard profile={profile} />

        <NutritionDietarySummary profile={profile} />

        <ClientNutritionNotesCard
          initialNotes={profile?.client_nutrition_notes ?? null}
        />
      </TabsContent>

      <TabsContent value="shopping" className="mt-4 grid gap-4">
        <ShoppingListCard
          assignment={assignment}
          days={planDays}
          planName={assignment?.meal_plan?.name}
          checkedFoodKeys={checkedFoodKeys}
          onToggleChecked={
            assignment
              ? async (foodKey, checked) => {
                  const result = await toggleShoppingListCheck({
                    assignmentId: assignment.id,
                    foodKey,
                    checked,
                  })
                  if (result.success) {
                    router.refresh()
                  }
                  return result
                }
              : undefined
          }
          onCyclesChange={
            assignment
              ? async (cycles) =>
                  updateShoppingListCycles({
                    assignmentId: assignment.id,
                    cycles,
                  })
              : undefined
          }
        />
      </TabsContent>
    </Tabs>
  )
}
