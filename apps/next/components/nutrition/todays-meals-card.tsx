import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatMealMacros,
  getTodayMealPlanDay,
  MEAL_TYPE_LABELS,
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
import { Info, UtensilsCrossed } from 'lucide-react'

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
  const { day, planComplete, planDayLabel } = getTodayMealPlanDay(
    assignment,
    days,
    todayKey
  )
  const dayTotals = day ? sumDayMacroTotals(day) : null
  const todayAlignment =
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s meals</CardTitle>
        <CardDescription>
          {assignment
            ? planDayLabel ?? 'Meals from your assigned plan.'
            : audience === 'coach'
              ? 'Assign a meal plan for daily guidance.'
              : 'Your coach can assign a meal plan for daily guidance.'}
        </CardDescription>
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
        ) : planComplete ? (
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
        ) : !day || day.meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No meals planned for today"
            description={
              audience === 'coach'
                ? 'Add meals to this day in the meal plan builder.'
                : 'Your coach may still be building this day in your plan.'
            }
            className="py-4"
          />
        ) : (
          <div className="grid gap-4">
            {todayAlignment?.isMisaligned ? (
              <div className="flex gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm text-blue-900 dark:text-blue-100">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>{formatMealPlanTargetHintForClient(todayAlignment)}</p>
              </div>
            ) : null}
            {day.notes ? (
              <p className="text-muted-foreground text-sm">{day.notes}</p>
            ) : null}
            <ul className="grid gap-3">
              {day.meals.map((meal) => {
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
