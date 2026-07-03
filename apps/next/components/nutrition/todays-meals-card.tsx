'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react'

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
  MEAL_TYPE_LABELS,
  sortMealPlanDays,
} from '@/lib/nutrition'
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
  audience = 'client',
}: TodaysMealsCardProps) {
  const isCoachView = audience === 'coach'
  const sortedDays = React.useMemo(() => sortMealPlanDays(days), [days])
  const [selectedDayIndex, setSelectedDayIndex] = React.useState(0)

  React.useEffect(() => {
    setSelectedDayIndex(0)
  }, [sortedDays])

  const selectedDay = sortedDays[selectedDayIndex] ?? null
  const selectedDayLabel = selectedDay ? formatMealPlanDayLabel(selectedDay) : null
  const showDayNavigation = sortedDays.length > 1
  const dayTotals = selectedDay ? sumDayMacroTotals(selectedDay) : null

  function goToPreviousDay() {
    setSelectedDayIndex((current) => Math.max(0, current - 1))
  }

  function goToNextDay() {
    setSelectedDayIndex((current) =>
      Math.min(sortedDays.length - 1, current + 1)
    )
  }

  const description = !assignment
    ? isCoachView
      ? 'Assign a meal plan for daily guidance.'
      : 'Your coach can assign a meal plan for daily guidance.'
    : selectedDayLabel
      ? isCoachView
        ? `${selectedDayLabel} in the assigned meal plan.`
        : `${selectedDayLabel} from your assigned plan.`
      : isCoachView
        ? 'Meals from the assigned plan.'
        : 'Meals from your assigned plan.'

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Meal plan</CardTitle>
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
              isCoachView
                ? 'Assign a meal plan from Setup to show meals here.'
                : 'When your coach assigns a plan, your meals will appear here.'
            }
            className="py-4"
          />
        ) : !selectedDay || selectedDay.meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={
              selectedDayLabel
                ? `No meals planned for ${selectedDayLabel}`
                : 'No meals planned yet'
            }
            description={
              isCoachView
                ? 'Add meals to this day in the meal plan builder.'
                : 'Your coach may still be building this day in your plan.'
            }
            className="py-4"
          />
        ) : (
          <div className="grid gap-4">
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
