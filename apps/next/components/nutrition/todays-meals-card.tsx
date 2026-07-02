'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Info, UtensilsCrossed } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { MacroTotalsBadges } from '@/components/nutrition/macro-totals-badges'
import {
  formatMealMacros,
  formatMealPlanDayLabel,
  getMealPlanDayIndexForOffset,
  getTodayMealPlanDay,
  MEAL_TYPE_LABELS,
  sortMealPlanDays,
} from '@/lib/nutrition'
import {
  assessMealPlanTargetAlignment,
  formatMealPlanTargetHintForClient,
} from '@/lib/meal-plan-target-alignment'
import { sumDayMacroTotals } from '@/lib/meal-plan-stats'
import type {
  ClientNutritionProfile,
  MealPlanAssignment,
  MealPlanDayWithMeals,
} from 'app/types/database'

type TodaysMealsCardProps = {
  assignment: MealPlanAssignment | null
  days: MealPlanDayWithMeals[]
  todayKey?: string
  profile?: ClientNutritionProfile | null
  audience?: 'coach' | 'client'
}

export function TodaysMealsCard({
  assignment,
  days,
  todayKey,
  profile = null,
  audience = 'client',
}: TodaysMealsCardProps) {
  const sortedDays = React.useMemo(() => sortMealPlanDays(days), [days])
  const todayPlan = React.useMemo(
    () => getTodayMealPlanDay(assignment, days, todayKey),
    [assignment, days, todayKey]
  )
  const defaultDayIndex = React.useMemo(() => {
    if (todayPlan.day) {
      return getMealPlanDayIndexForOffset(sortedDays, todayPlan.day.day_offset)
    }
    return 0
  }, [sortedDays, todayPlan.day])
  const [selectedDayIndex, setSelectedDayIndex] = React.useState(defaultDayIndex)

  React.useEffect(() => {
    setSelectedDayIndex(defaultDayIndex)
  }, [defaultDayIndex])

  const selectedDay = sortedDays[selectedDayIndex] ?? null
  const selectedDayLabel = selectedDay ? formatMealPlanDayLabel(selectedDay) : null
  const isViewingScheduledToday =
    !todayPlan.planComplete &&
    selectedDay != null &&
    selectedDay.day_offset === todayPlan.dayOffset
  const showDayNavigation = sortedDays.length > 1
  const showPlanCompleteState =
    todayPlan.planComplete && sortedDays.length <= 1 && !selectedDay?.meals.length
  const dayTotals = selectedDay ? sumDayMacroTotals(selectedDay) : null
  const dayAlignment =
    dayTotals && dayTotals.caloriesKcal > 0
      ? assessMealPlanTargetAlignment(
          {
            dayCount: days.length,
            avgDailyMacros: dayTotals,
            hasMacroData: true,
          },
          profile?.calories_kcal
        )
      : null

  function goToPreviousDay() {
    setSelectedDayIndex((current) => Math.max(0, current - 1))
  }

  function goToNextDay() {
    setSelectedDayIndex((current) =>
      Math.min(sortedDays.length - 1, current + 1)
    )
  }

  const description = !assignment
    ? audience === 'coach'
      ? 'Assign a meal plan for daily guidance.'
      : 'Your coach can assign a meal plan for daily guidance.'
    : isViewingScheduledToday
      ? "Meals scheduled for today from your assigned plan."
      : selectedDayLabel
        ? `${selectedDayLabel} from your assigned plan.`
        : 'Meals from your assigned plan.'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>
            {isViewingScheduledToday ? "Today's meals" : 'Plan meals'}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {assignment && showDayNavigation ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              disabled={selectedDayIndex <= 0}
              onClick={goToPreviousDay}
              aria-label="Previous plan day"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[5.5rem] px-1 text-center text-sm font-medium">
              {selectedDayLabel ?? `Day ${selectedDayIndex + 1}`}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              disabled={selectedDayIndex >= sortedDays.length - 1}
              onClick={goToNextDay}
              aria-label="Next plan day"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {!assignment ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No meal plan assigned"
            description={
              audience === 'coach'
                ? 'Assign a meal plan from Setup to show daily meals here.'
                : "When your coach assigns a plan, today's meals will appear here."
            }
            className="py-4"
          />
        ) : showPlanCompleteState ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Plan cycle complete"
            description={
              audience === 'coach'
                ? 'Extend or assign a new meal plan for the next phase.'
                : "You've reached the end of your current meal plan. Ask your coach for the next phase."
            }
            className="py-4"
          />
        ) : !selectedDay || selectedDay.meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={
              selectedDayLabel
                ? `No meals planned for ${selectedDayLabel}`
                : 'No meals planned for today'
            }
            description={
              audience === 'coach'
                ? 'Add meals to this day in the meal plan builder.'
                : 'Your coach may still be building this day in your plan.'
            }
            className="py-4"
          />
        ) : (
          <div className="grid gap-4">
            {todayPlan.planComplete ? (
              <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  {audience === 'coach'
                    ? 'This client has reached the end of the current plan cycle. Extend or assign a new plan for the next phase.'
                    : "You've reached the end of your current meal plan. Browse other days below or ask your coach for the next phase."}
                </p>
              </div>
            ) : null}
            {dayAlignment?.isMisaligned && isViewingScheduledToday ? (
              <div className="flex gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm text-blue-900 dark:text-blue-100">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>{formatMealPlanTargetHintForClient(dayAlignment)}</p>
              </div>
            ) : null}
            {dayTotals ? (
              <MacroTotalsBadges totals={dayTotals} label="Day total" />
            ) : null}
            {selectedDay.notes ? (
              <p className="text-muted-foreground text-sm">{selectedDay.notes}</p>
            ) : null}
            <ul className="grid gap-3">
              {selectedDay.meals.map((meal) => {
                const macros = formatMealMacros(meal)
                return (
                  <li
                    key={meal.id}
                    className="border-border bg-muted/20 rounded-lg border px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        {MEAL_TYPE_LABELS[meal.meal_type]}
                      </span>
                      <span className="font-medium">{meal.name}</span>
                    </div>
                    {meal.foods.length > 0 ? (
                      <ul className="text-muted-foreground mt-2 grid gap-1 text-sm">
                        {meal.foods.map((food) => (
                          <li key={food.id}>
                            {food.quantity_g} g {food.food_name}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {meal.description ? (
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {meal.description}
                      </p>
                    ) : null}
                    {macros ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {macros}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
