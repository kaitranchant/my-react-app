'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  addMealPlanMealFood,
  createMealPlanDay,
  createMealPlanMeal,
  deleteMealPlanDay,
  deleteMealPlanMeal,
  deleteMealPlanMealFood,
  updateMealPlanDay,
} from '@/app/(dashboard)/library/meal-plans/[planId]/actions'
import { FoodSearchPicker } from '@/components/nutrition/food-search-picker'
import { MacroTotalsBadges } from '@/components/nutrition/macro-totals-badges'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  formatFoodMacrosShort,
  formatFoodQuantityLabel,
  type FoodSelectionSnapshot,
} from '@/lib/food-catalog'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'
import { sumMealPlanMealFoodMacros } from '@/lib/meal-plan-meal-foods'
import {
  getMealMacroTotals,
  sumDayMacroTotals,
} from '@/lib/meal-plan-stats'
import {
  mealTypes,
  type MealPlanMealFoodFormValues,
} from '@/lib/validations/nutrition'
import type { MealPlanDayWithMeals } from 'app/types/database'

type MealPlanDayEditorProps = {
  mealPlanId: string
  days: MealPlanDayWithMeals[]
}

function snapshotToMealFoodValues(
  snapshot: FoodSelectionSnapshot,
  sortOrder: number
): MealPlanMealFoodFormValues {
  return {
    source: snapshot.source,
    externalId: snapshot.externalId,
    foodName: snapshot.foodName,
    quantityG: snapshot.quantityG,
    caloriesKcal: snapshot.caloriesKcal,
    proteinG: snapshot.proteinG,
    carbsG: snapshot.carbsG,
    fatG: snapshot.fatG,
    sortOrder,
  }
}

export function MealPlanDayEditor({ mealPlanId, days }: MealPlanDayEditorProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const nextDayOffset =
    days.length > 0 ? Math.max(...days.map((day) => day.day_offset)) + 1 : 0

  async function handleAddDay() {
    setPending(true)
    const result = await createMealPlanDay(mealPlanId, {
      dayOffset: nextDayOffset,
      notes: null,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Day added.')
    router.refresh()
  }

  async function handleDeleteDay(dayId: string) {
    if (!window.confirm('Delete this day and all of its meals?')) return

    setPending(true)
    const result = await deleteMealPlanDay(mealPlanId, dayId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Day deleted.')
    router.refresh()
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          {days.length} day{days.length === 1 ? '' : 's'} in this plan
        </p>
        <Button size="sm" disabled={pending} onClick={handleAddDay}>
          <Plus className="size-4" />
          Add day
        </Button>
      </div>

      {days.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Add a day to start building meals for this plan.
          </CardContent>
        </Card>
      ) : (
        days.map((day) => (
          <MealPlanDayCard
            key={day.id}
            mealPlanId={mealPlanId}
            day={day}
            disabled={pending}
            onDeleteDay={() => handleDeleteDay(day.id)}
          />
        ))
      )}
    </div>
  )
}

function MealPlanDayCard({
  mealPlanId,
  day,
  disabled,
  onDeleteDay,
}: {
  mealPlanId: string
  day: MealPlanDayWithMeals
  disabled: boolean
  onDeleteDay: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [label, setLabel] = React.useState(day.label ?? '')
  const [mealType, setMealType] = React.useState<(typeof mealTypes)[number]>('breakfast')
  const [mealName, setMealName] = React.useState('')
  const [mealDescription, setMealDescription] = React.useState('')
  const [draftFoods, setDraftFoods] = React.useState<MealPlanMealFoodFormValues[]>(
    []
  )
  const [expandedMealId, setExpandedMealId] = React.useState<string | null>(null)
  const defaultDayName = `Day ${day.day_offset + 1}`
  const dayTotals = sumDayMacroTotals(day)
  const draftTotals = React.useMemo(() => {
    if (draftFoods.length === 0) return null

    const totals = sumMealPlanMealFoodMacros(
      draftFoods.map((food) => ({
        calories_kcal: food.caloriesKcal,
        protein_g: food.proteinG,
        carbs_g: food.carbsG,
        fat_g: food.fatG,
      }))
    )

    if (totals.caloriesKcal == null) return null

    return {
      caloriesKcal: totals.caloriesKcal,
      proteinG: totals.proteinG ?? 0,
      carbsG: totals.carbsG ?? 0,
      fatG: totals.fatG ?? 0,
    }
  }, [draftFoods])

  React.useEffect(() => {
    setLabel(day.label ?? '')
  }, [day.label])

  async function handleLabelSave() {
    const trimmed = label.trim()
    const current = day.label?.trim() ?? ''
    if (trimmed === current) return

    setPending(true)
    const result = await updateMealPlanDay(mealPlanId, day.id, {
      label: trimmed || null,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      setLabel(day.label ?? '')
      return
    }

    toast.success('Day name saved.')
    router.refresh()
  }

  function handleDraftFoodAdd(snapshot: FoodSelectionSnapshot) {
    setDraftFoods((current) => [
      ...current,
      snapshotToMealFoodValues(snapshot, current.length),
    ])
  }

  function handleRemoveDraftFood(index: number) {
    setDraftFoods((current) =>
      current
        .filter((_, foodIndex) => foodIndex !== index)
        .map((food, foodIndex) => ({ ...food, sortOrder: foodIndex }))
    )
  }

  async function handleAddMeal(event: React.FormEvent) {
    event.preventDefault()

    if (!mealName.trim() && draftFoods.length === 0) {
      toast.error('Add at least one food or enter a meal name.')
      return
    }

    setPending(true)
    const result = await createMealPlanMeal(mealPlanId, day.id, {
      mealType,
      name: mealName.trim() || undefined,
      description: mealDescription.trim() || null,
      caloriesKcal: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      sortOrder: day.meals.length,
      foods: draftFoods,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setMealName('')
    setMealDescription('')
    setDraftFoods([])
    toast.success('Meal added.')
    router.refresh()
  }

  async function handleDeleteMeal(mealId: string) {
    setPending(true)
    const result = await deleteMealPlanMeal(mealPlanId, mealId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Meal deleted.')
    router.refresh()
  }

  async function handleAddFoodToMeal(
    mealId: string,
    snapshot: FoodSelectionSnapshot,
    existingCount: number
  ) {
    setPending(true)
    const result = await addMealPlanMealFood(
      mealPlanId,
      mealId,
      snapshotToMealFoodValues(snapshot, existingCount)
    )
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Food added to meal.')
    router.refresh()
  }

  async function handleDeleteMealFood(mealId: string, foodId: string) {
    setPending(true)
    const result = await deleteMealPlanMealFood(mealPlanId, mealId, foodId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Food removed.')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid min-w-0 flex-1 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`day-label-${day.id}`} className="sr-only">
              Day name
            </Label>
            <Input
              id={`day-label-${day.id}`}
              value={label}
              placeholder={defaultDayName}
              disabled={disabled || pending}
              onChange={(event) => setLabel(event.target.value)}
              onBlur={handleLabelSave}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
              }}
              className="h-9 max-w-sm text-base font-semibold"
            />
            <p className="text-muted-foreground text-xs">
              Defaults to {defaultDayName} when left blank
            </p>
          </div>
          {day.notes ? (
            <CardDescription>{day.notes}</CardDescription>
          ) : null}
          {dayTotals ? (
            <MacroTotalsBadges totals={dayTotals} label="Day total" />
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || pending}
          onClick={onDeleteDay}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete day</span>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {day.meals.length > 0 ? (
          <ul className="grid gap-2">
            {day.meals.map((meal) => {
              const mealTotals = getMealMacroTotals(meal)
              const isExpanded = expandedMealId === meal.id
              return (
                <li
                  key={meal.id}
                  className="border-border rounded-lg border px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {MEAL_TYPE_LABELS[meal.meal_type]} — {meal.name}
                      </p>
                      {mealTotals ? (
                        <MacroTotalsBadges
                          totals={mealTotals}
                          className="mt-1.5"
                        />
                      ) : null}
                      {meal.description ? (
                        <p className="text-muted-foreground text-sm">
                          {meal.description}
                        </p>
                      ) : null}
                      {meal.foods.length > 0 ? (
                        <ul className="text-muted-foreground mt-2 grid gap-1 text-sm">
                          {meal.foods.map((food) => (
                            <li
                              key={food.id}
                              className="flex items-start justify-between gap-2"
                            >
                              <span>
                                {formatFoodQuantityLabel(food.quantity_g, food.food_name)}
                                {food.calories_kcal != null
                                  ? ` — ${formatFoodMacrosShort({
                                      caloriesKcal: food.calories_kcal,
                                      proteinG: food.protein_g ?? 0,
                                      carbsG: food.carbs_g ?? 0,
                                      fatG: food.fat_g ?? 0,
                                    })}`
                                  : null}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0"
                                disabled={disabled || pending}
                                onClick={() => handleDeleteMealFood(meal.id, food.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={disabled || pending}
                        onClick={() =>
                          setExpandedMealId(isExpanded ? null : meal.id)
                        }
                      >
                        {isExpanded ? 'Close' : 'Add food'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={disabled || pending}
                        onClick={() => handleDeleteMeal(meal.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="border-border mt-3 border-t pt-3">
                      <FoodSearchPicker
                        disabled={disabled || pending}
                        addLabel="Add to meal"
                        onAdd={(snapshot) =>
                          handleAddFoodToMeal(meal.id, snapshot, meal.foods.length)
                        }
                      />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No meals yet for this day.</p>
        )}

        <form onSubmit={handleAddMeal} className="border-border grid gap-4 rounded-lg border p-4">
          <p className="text-sm font-medium">Add meal</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Meal type</Label>
              <Select
                value={mealType}
                onValueChange={(value) =>
                  setMealType(value as (typeof mealTypes)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {MEAL_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`meal-name-${day.id}`}>Name (optional)</Label>
              <Input
                id={`meal-name-${day.id}`}
                value={mealName}
                onChange={(event) => setMealName(event.target.value)}
                placeholder="e.g. Greek yogurt bowl"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`meal-description-${day.id}`}>Description</Label>
            <Textarea
              id={`meal-description-${day.id}`}
              rows={2}
              value={mealDescription}
              onChange={(event) => setMealDescription(event.target.value)}
              placeholder="Optional prep notes"
            />
          </div>

          <FoodSearchPicker
            disabled={disabled || pending}
            onAdd={handleDraftFoodAdd}
          />

          {draftFoods.length > 0 ? (
            <div className="grid gap-2">
              {draftTotals ? (
                <MacroTotalsBadges totals={draftTotals} label="Meal total" />
              ) : null}
              <ul className="border-border grid gap-2 rounded-lg border p-3">
              {draftFoods.map((food, index) => (
                <li
                  key={`${food.externalId ?? food.foodName}-${index}`}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span>
                    {formatFoodQuantityLabel(food.quantityG, food.foodName)}
                    {food.caloriesKcal != null
                      ? ` — ${formatFoodMacrosShort({
                          caloriesKcal: food.caloriesKcal,
                          proteinG: food.proteinG ?? 0,
                          carbsG: food.carbsG ?? 0,
                          fatG: food.fatG ?? 0,
                        })}`
                      : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    disabled={disabled || pending}
                    onClick={() => handleRemoveDraftFood(index)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={disabled || pending}>
              Add meal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
