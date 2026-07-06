'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus, UtensilsCrossed } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatMealMacros,
  formatMealPlanDayLabel,
  getMealPlanDayIndexForOffset,
  getMealPlanDayOffset,
  MEAL_TYPE_LABELS,
  sortMealPlanDays,
} from '@/lib/nutrition'
import type {
  MealPlanAssignment,
  MealPlanDayWithMeals,
  MealPlanMealWithFoods,
} from 'app/types/database'

type MealPlanMealPickerProps = {
  assignment: MealPlanAssignment | null
  days: MealPlanDayWithMeals[]
  logDate: string
  disabled?: boolean
  onAddMeal: (meal: MealPlanMealWithFoods) => Promise<void>
}

export function MealPlanMealPicker({
  assignment,
  days,
  logDate,
  disabled = false,
  onAddMeal,
}: MealPlanMealPickerProps) {
  const [pendingMealId, setPendingMealId] = React.useState<string | null>(null)
  const sortedDays = React.useMemo(() => sortMealPlanDays(days), [days])

  const defaultDayIndex = React.useMemo(() => {
    if (!assignment || sortedDays.length === 0) return 0
    const dayOffset = getMealPlanDayOffset(assignment, logDate)
    const maxOffset = sortedDays[sortedDays.length - 1]?.day_offset ?? 0
    const clampedOffset = Math.min(dayOffset, maxOffset)
    return getMealPlanDayIndexForOffset(sortedDays, clampedOffset)
  }, [assignment, logDate, sortedDays])

  const [selectedDayIndex, setSelectedDayIndex] = React.useState(defaultDayIndex)

  React.useEffect(() => {
    setSelectedDayIndex(defaultDayIndex)
  }, [defaultDayIndex])

  const selectedDay = sortedDays[selectedDayIndex] ?? null
  const selectedDayLabel = selectedDay ? formatMealPlanDayLabel(selectedDay) : null
  const showDayNavigation = sortedDays.length > 1

  async function handleAddMeal(meal: MealPlanMealWithFoods) {
    setPendingMealId(meal.id)
    try {
      await onAddMeal(meal)
    } finally {
      setPendingMealId(null)
    }
  }

  if (!assignment) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="No meal plan assigned"
        description="When a meal plan is assigned, you can log meals from it here."
        className="py-4"
      />
    )
  }

  if (sortedDays.length === 0) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="No plan days yet"
        description="Add days and meals to the assigned meal plan first."
        className="py-4"
      />
    )
  }

  if (!selectedDay || selectedDay.meals.length === 0) {
    return (
      <div className="grid gap-3">
        {showDayNavigation ? (
          <PlanDayNavigator
            selectedDayLabel={selectedDayLabel}
            selectedDayIndex={selectedDayIndex}
            dayCount={sortedDays.length}
            onPrevious={() => setSelectedDayIndex((current) => Math.max(0, current - 1))}
            onNext={() =>
              setSelectedDayIndex((current) =>
                Math.min(sortedDays.length - 1, current + 1)
              )
            }
          />
        ) : null}
        <EmptyState
          icon={UtensilsCrossed}
          title={
            selectedDayLabel
              ? `No meals planned for ${selectedDayLabel}`
              : 'No meals planned for this day'
          }
          description="Try another plan day, or add meals in the meal plan builder."
          className="py-4"
        />
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Browse any plan day and log meals to your diary for this date.
        </p>
        {showDayNavigation ? (
          <PlanDayNavigator
            selectedDayLabel={selectedDayLabel}
            selectedDayIndex={selectedDayIndex}
            dayCount={sortedDays.length}
            onPrevious={() => setSelectedDayIndex((current) => Math.max(0, current - 1))}
            onNext={() =>
              setSelectedDayIndex((current) =>
                Math.min(sortedDays.length - 1, current + 1)
              )
            }
          />
        ) : selectedDayLabel ? (
          <span className="text-sm font-medium">{selectedDayLabel}</span>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {selectedDay.meals.map((meal) => {
          const macros = formatMealMacros(meal)
          const isPending = pendingMealId === meal.id
          const itemCount = meal.foods.length > 0 ? meal.foods.length : 1

          return (
            <li
              key={meal.id}
              className="border-border bg-background flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {MEAL_TYPE_LABELS[meal.meal_type]}
                  </span>
                  <span className="text-sm font-medium">{meal.name}</span>
                </div>
                {meal.foods.length > 0 ? (
                  <ul className="text-muted-foreground mt-1 grid gap-0.5 text-xs">
                    {meal.foods.map((food) => (
                      <li key={food.id}>
                        {food.quantity_g} g {food.food_name}
                      </li>
                    ))}
                  </ul>
                ) : meal.description ? (
                  <p className="text-muted-foreground mt-1 text-xs">{meal.description}</p>
                ) : null}
                {macros ? (
                  <p className="text-muted-foreground mt-1 text-xs">{macros}</p>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={disabled || isPending}
                onClick={() => void handleAddMeal(meal)}
              >
                <Plus className="size-3.5" />
                {isPending
                  ? 'Logging…'
                  : itemCount > 1
                    ? `Log ${itemCount} items`
                    : 'Log meal'}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type PlanDayNavigatorProps = {
  selectedDayLabel: string | null
  selectedDayIndex: number
  dayCount: number
  onPrevious: () => void
  onNext: () => void
}

function PlanDayNavigator({
  selectedDayLabel,
  selectedDayIndex,
  dayCount,
  onPrevious,
  onNext,
}: PlanDayNavigatorProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        disabled={selectedDayIndex <= 0}
        onClick={onPrevious}
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
        disabled={selectedDayIndex >= dayCount - 1}
        onClick={onNext}
        aria-label="Next plan day"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
