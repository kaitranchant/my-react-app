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
import type {
  MealPlanAssignment,
  MealPlanDayWithMeals,
} from 'app/types/database'
import { UtensilsCrossed } from 'lucide-react'

type TodaysMealsCardProps = {
  assignment: MealPlanAssignment | null
  days: MealPlanDayWithMeals[]
  todayKey?: string
}

export function TodaysMealsCard({
  assignment,
  days,
  todayKey,
}: TodaysMealsCardProps) {
  const { day, planComplete, planDayLabel } = getTodayMealPlanDay(
    assignment,
    days,
    todayKey
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s meals</CardTitle>
        <CardDescription>
          {assignment
            ? planDayLabel ?? 'Meals from your assigned plan.'
            : 'Your coach can assign a meal plan for daily guidance.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!assignment ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No meal plan assigned"
            description="When your coach assigns a plan, today's meals will appear here."
            className="py-4"
          />
        ) : planComplete ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            You&apos;ve reached the end of your current meal plan. Ask your
            coach for the next phase.
          </p>
        ) : !day || day.meals.length === 0 ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            No meals planned for today.
          </p>
        ) : (
          <div className="grid gap-4">
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
