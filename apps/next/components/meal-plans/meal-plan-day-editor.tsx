'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'

import {
  addMealPlanMealFood,
  createMealPlanDay,
  createMealPlanMeal,
  deleteMealPlanDay,
  deleteMealPlanMeal,
  deleteMealPlanMealFood,
  updateMealPlanDay,
  updateMealPlanMeal,
  updateMealPlanMealFood,
} from '@/app/(dashboard)/library/meal-plans/[planId]/actions'
import { MealLibraryPickerDialog } from '@/components/meal-library/meal-library-picker-dialog'
import { SaveMealToLibraryDialog } from '@/components/meal-library/save-meal-to-library-dialog'
import { MealFoodPicker } from '@/components/nutrition/meal-food-picker'
import { ManualFoodEntryForm } from '@/components/nutrition/manual-food-entry-form'
import { MacroTotalsBadges } from '@/components/nutrition/macro-totals-badges'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
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
  rescaleFoodMacrosByQuantity,
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
import type {
  MealPlanDayWithMeals,
  MealPlanMealFood,
  MealPlanMealWithFoods,
} from 'app/types/database'

type MealPlanDayEditorProps = {
  mealPlanId: string
  days: MealPlanDayWithMeals[]
}

function patchDayInDays(
  days: MealPlanDayWithMeals[],
  dayId: string,
  patch: Partial<Pick<MealPlanDayWithMeals, 'label' | 'notes'>>
): MealPlanDayWithMeals[] {
  return days.map((day) => (day.id === dayId ? { ...day, ...patch } : day))
}

function patchMealInDays(
  days: MealPlanDayWithMeals[],
  dayId: string,
  mealId: string,
  patch: Partial<Pick<MealPlanMealWithFoods, 'name' | 'meal_type' | 'description'>>
): MealPlanDayWithMeals[] {
  return days.map((day) => {
    if (day.id !== dayId) return day
    return {
      ...day,
      meals: day.meals.map((meal) =>
        meal.id === mealId ? { ...meal, ...patch } : meal
      ),
    }
  })
}

function removeMealFromDays(
  days: MealPlanDayWithMeals[],
  dayId: string,
  mealId: string
): MealPlanDayWithMeals[] {
  return days.map((day) =>
    day.id === dayId
      ? { ...day, meals: day.meals.filter((meal) => meal.id !== mealId) }
      : day
  )
}

function removeDayFromDays(
  days: MealPlanDayWithMeals[],
  dayId: string
): MealPlanDayWithMeals[] {
  return days.filter((day) => day.id !== dayId)
}

function refreshMealPlanInBackground(router: ReturnType<typeof useRouter>) {
  React.startTransition(() => {
    router.refresh()
  })
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

function mealFoodToFormValues(food: MealPlanMealFood): MealPlanMealFoodFormValues {
  return {
    source: food.source,
    externalId: food.external_id,
    foodName: food.food_name,
    quantityG: food.quantity_g,
    caloriesKcal: food.calories_kcal,
    proteinG: food.protein_g,
    carbsG: food.carbs_g,
    fatG: food.fat_g,
    sortOrder: food.sort_order,
  }
}

function MealPlanFoodPicker({
  idPrefix,
  disabled,
  addLabel = 'Add food',
  onAdd,
}: {
  idPrefix: string
  disabled: boolean
  addLabel?: string
  onAdd: (snapshot: FoodSelectionSnapshot) => void
}) {
  return (
    <MealFoodPicker
      idPrefix={idPrefix}
      disabled={disabled}
      addLabel={addLabel}
      onAdd={onAdd}
    />
  )
}

function MealPlanFoodQuantityEditor({
  food,
  disabled,
  onSave,
  onCancel,
}: {
  food: MealPlanMealFood
  disabled: boolean
  onSave: (values: MealPlanMealFoodFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [quantityG, setQuantityG] = React.useState(String(food.quantity_g))
  const [saving, setSaving] = React.useState(false)
  const parsedQuantity = Number(quantityG)
  const quantityIsValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0
  const preview =
    quantityIsValid && food.calories_kcal != null
      ? rescaleFoodMacrosByQuantity(
          {
            quantityG: food.quantity_g,
            caloriesKcal: food.calories_kcal,
            proteinG: food.protein_g ?? 0,
            carbsG: food.carbs_g ?? 0,
            fatG: food.fat_g ?? 0,
          },
          parsedQuantity
        )
      : null

  async function handleSave() {
    if (!quantityIsValid) return

    setSaving(true)
    const scaled =
      preview ??
      rescaleFoodMacrosByQuantity(
        {
          quantityG: food.quantity_g,
          caloriesKcal: food.calories_kcal ?? 0,
          proteinG: food.protein_g ?? 0,
          carbsG: food.carbs_g ?? 0,
          fatG: food.fat_g ?? 0,
        },
        parsedQuantity
      )

    await onSave({
      ...mealFoodToFormValues(food),
      quantityG: parsedQuantity,
      caloriesKcal: scaled.caloriesKcal,
      proteinG: scaled.proteinG,
      carbsG: scaled.carbsG,
      fatG: scaled.fatG,
    })
    setSaving(false)
  }

  return (
    <div className="border-border grid gap-2 rounded-lg border p-2">
      <p className="text-sm font-medium">{food.food_name}</p>
      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor={`food-quantity-${food.id}`}>Quantity (g)</Label>
        <Input
          id={`food-quantity-${food.id}`}
          type="number"
          min="1"
          step="1"
          value={quantityG}
          disabled={disabled || saving}
          onChange={(event) => setQuantityG(event.target.value)}
        />
      </div>
      {preview ? (
        <p className="text-muted-foreground text-xs">
          {formatFoodQuantityLabel(parsedQuantity, food.food_name)}:{' '}
          {formatFoodMacrosShort({
            caloriesKcal: preview.caloriesKcal,
            proteinG: preview.proteinG,
            carbsG: preview.carbsG,
            fatG: preview.fatG,
          })}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={disabled || saving || !quantityIsValid}
          onClick={() => void handleSave()}
        >
          Save changes
        </Button>
      </div>
    </div>
  )
}

function MealPlanMealEditForm({
  meal,
  disabled,
  onSave,
  onCancel,
}: {
  meal: MealPlanMealWithFoods
  disabled: boolean
  onSave: (values: {
    mealType: (typeof mealTypes)[number]
    description: string
  }) => Promise<void>
  onCancel: () => void
}) {
  const [mealType, setMealType] = React.useState(meal.meal_type)
  const [mealDescription, setMealDescription] = React.useState(meal.description ?? '')
  const [saving, setSaving] = React.useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    await onSave({
      mealType,
      description: mealDescription,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-3">
      <div className="grid gap-2 sm:max-w-xs">
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
        <Label htmlFor={`edit-meal-description-${meal.id}`}>Description</Label>
        <Textarea
          id={`edit-meal-description-${meal.id}`}
          rows={2}
          value={mealDescription}
          onChange={(event) => setMealDescription(event.target.value)}
          placeholder="Optional prep notes"
          disabled={disabled || saving}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={disabled || saving}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

export function MealPlanDayEditor({ mealPlanId, days: initialDays }: MealPlanDayEditorProps) {
  const router = useRouter()
  const [days, setDays] = React.useState(initialDays)
  const [pending, setPending] = React.useState(false)
  const pendingDeleteDayId = React.useRef<string | null>(null)
  const nextDayOffset =
    days.length > 0 ? Math.max(...days.map((day) => day.day_offset)) + 1 : 0

  React.useEffect(() => {
    setDays(initialDays)
  }, [initialDays])

  const deleteDayConfirm = useConfirmDialog({
    title: 'Delete this day?',
    description: 'This removes the day and all of its meals and foods.',
    confirmLabel: 'Delete day',
    destructive: true,
    onConfirm: async () => {
      const dayId = pendingDeleteDayId.current
      if (!dayId) return

      setPending(true)
      const result = await deleteMealPlanDay(mealPlanId, dayId)
      setPending(false)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Day deleted.')
      pendingDeleteDayId.current = null
      setDays((current) =>
        dayId ? removeDayFromDays(current, dayId) : current
      )
      refreshMealPlanInBackground(router)
    },
  })

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
    refreshMealPlanInBackground(router)
  }

  function requestDeleteDay(dayId: string) {
    pendingDeleteDayId.current = dayId
    deleteDayConfirm.open()
  }

  return (
    <>
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
            <CardContent>
              <EmptyState
                icon={UtensilsCrossed}
                title="No days in this plan yet"
                description="Add a day to start building meals for this template."
              />
            </CardContent>
          </Card>
        ) : (
          days.map((day) => (
            <MealPlanDayCard
              key={day.id}
              mealPlanId={mealPlanId}
              day={day}
              disabled={false}
              onDaysChange={setDays}
              onDeleteDay={() => requestDeleteDay(day.id)}
            />
          ))
        )}
      </div>
      {deleteDayConfirm.dialog}
    </>
  )
}

function MealPlanDayCard({
  mealPlanId,
  day,
  disabled,
  onDaysChange,
  onDeleteDay,
}: {
  mealPlanId: string
  day: MealPlanDayWithMeals
  disabled: boolean
  onDaysChange: React.Dispatch<React.SetStateAction<MealPlanDayWithMeals[]>>
  onDeleteDay: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [savingMealNameId, setSavingMealNameId] = React.useState<string | null>(null)
  const [savingDayLabel, setSavingDayLabel] = React.useState(false)
  const pendingDeleteMealId = React.useRef<string | null>(null)
  const pendingDeleteFood = React.useRef<{
    mealId: string
    foodId: string
  } | null>(null)
  const [label, setLabel] = React.useState(day.label ?? '')
  const [mealNames, setMealNames] = React.useState<Record<string, string>>({})
  const [mealType, setMealType] = React.useState<(typeof mealTypes)[number]>('breakfast')
  const [mealName, setMealName] = React.useState('')
  const [mealDescription, setMealDescription] = React.useState('')
  const [draftFoods, setDraftFoods] = React.useState<MealPlanMealFoodFormValues[]>(
    []
  )
  const [expandedMealId, setExpandedMealId] = React.useState<string | null>(null)
  const [editingMealId, setEditingMealId] = React.useState<string | null>(null)
  const [editingFood, setEditingFood] = React.useState<{
    mealId: string
    foodId: string
  } | null>(null)
  const labelSaveTimeoutRef = React.useRef<number | null>(null)
  const defaultDayName = `Day ${day.day_offset + 1}`
  const dayTotals = sumDayMacroTotals(day)

  const deleteMealConfirm = useConfirmDialog({
    title: 'Delete this meal?',
    description: 'This removes the meal and all foods assigned to it.',
    confirmLabel: 'Delete meal',
    destructive: true,
    onConfirm: async () => {
      const mealId = pendingDeleteMealId.current
      if (!mealId) return

      setPending(true)
      const result = await deleteMealPlanMeal(mealPlanId, mealId)
      setPending(false)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Meal deleted.')
      pendingDeleteMealId.current = null
      onDaysChange((current) =>
        mealId ? removeMealFromDays(current, day.id, mealId) : current
      )
      refreshMealPlanInBackground(router)
    },
  })

  const deleteFoodConfirm = useConfirmDialog({
    title: 'Remove this food?',
    description: 'This removes the food from the meal.',
    confirmLabel: 'Remove food',
    destructive: true,
    onConfirm: async () => {
      const target = pendingDeleteFood.current
      if (!target) return

      setPending(true)
      const result = await deleteMealPlanMealFood(
        mealPlanId,
        target.mealId,
        target.foodId
      )
      setPending(false)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Food removed.')
      pendingDeleteFood.current = null
      refreshMealPlanInBackground(router)
    },
  })

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

  React.useEffect(() => {
    setMealNames((current) => {
      const next = { ...current }
      for (const meal of day.meals) {
        if (savingMealNameId === meal.id) continue
        next[meal.id] = meal.name
      }
      for (const mealId of Object.keys(next)) {
        if (!day.meals.some((meal) => meal.id === mealId)) {
          delete next[mealId]
        }
      }
      return next
    })
  }, [day.meals, savingMealNameId])

  React.useEffect(() => {
    return () => {
      if (labelSaveTimeoutRef.current) {
        window.clearTimeout(labelSaveTimeoutRef.current)
      }
    }
  }, [])

  function scheduleLabelSave() {
    if (labelSaveTimeoutRef.current) {
      window.clearTimeout(labelSaveTimeoutRef.current)
    }

    labelSaveTimeoutRef.current = window.setTimeout(() => {
      labelSaveTimeoutRef.current = null
      void handleLabelSave()
    }, 0)
  }

  async function handleLabelSave() {
    const trimmed = label.trim()
    const current = day.label?.trim() ?? ''
    if (trimmed === current) return

    setSavingDayLabel(true)
    const result = await updateMealPlanDay(mealPlanId, day.id, {
      label: trimmed || null,
    })
    setSavingDayLabel(false)

    if (!result.success) {
      toast.error(result.error)
      setLabel(day.label ?? '')
      return
    }

    onDaysChange((current) =>
      patchDayInDays(current, day.id, { label: trimmed || null })
    )
    refreshMealPlanInBackground(router)
  }

  async function handleMealNameSave(mealId: string) {
    const meal = day.meals.find((row) => row.id === mealId)
    if (!meal) return

    const draft = mealNames[mealId] ?? meal.name
    const trimmed = draft.trim()
    const current = meal.name.trim()
    if (trimmed === current) return

    const fallbackName =
      trimmed ||
      `${meal.meal_type.charAt(0).toUpperCase()}${meal.meal_type.slice(1)}`

    setSavingMealNameId(mealId)
    const result = await updateMealPlanMeal(mealPlanId, mealId, {
      name: trimmed || undefined,
    })
    setSavingMealNameId(null)

    if (!result.success) {
      toast.error(result.error)
      setMealNames((current) => ({ ...current, [mealId]: meal.name }))
      return
    }

    setMealNames((current) => ({ ...current, [mealId]: fallbackName }))
    onDaysChange((current) =>
      patchMealInDays(current, day.id, mealId, { name: fallbackName })
    )
    refreshMealPlanInBackground(router)
  }

  function scheduleMealNameSave(mealId: string) {
    window.setTimeout(() => {
      void handleMealNameSave(mealId)
    }, 0)
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
    refreshMealPlanInBackground(router)
  }

  async function handleDeleteMeal(mealId: string) {
    pendingDeleteMealId.current = mealId
    deleteMealConfirm.open()
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
    refreshMealPlanInBackground(router)
  }

  async function handleDeleteMealFood(mealId: string, foodId: string) {
    pendingDeleteFood.current = { mealId, foodId }
    deleteFoodConfirm.open()
  }

  async function handleUpdateMeal(
    mealId: string,
    values: {
      mealType: (typeof mealTypes)[number]
      description: string
    }
  ) {
    setPending(true)
    const result = await updateMealPlanMeal(mealPlanId, mealId, {
      mealType: values.mealType,
      description: values.description.trim() || null,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    onDaysChange((current) =>
      patchMealInDays(current, day.id, mealId, {
        meal_type: values.mealType,
        description: values.description.trim() || null,
      })
    )
    setEditingMealId(null)
    refreshMealPlanInBackground(router)
  }

  async function handleUpdateMealFood(
    mealId: string,
    foodId: string,
    values: MealPlanMealFoodFormValues
  ) {
    setPending(true)
    const result = await updateMealPlanMealFood(mealPlanId, mealId, foodId, values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setEditingFood(null)
    toast.success('Food updated.')
    refreshMealPlanInBackground(router)
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
              disabled={disabled || savingDayLabel}
              onChange={(event) => setLabel(event.target.value)}
              onBlur={scheduleLabelSave}
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
              const isEditingMeal = editingMealId === meal.id
              return (
                <li
                  key={meal.id}
                  className="border-border rounded-lg border px-3 py-2"
                >
                  {isEditingMeal ? (
                    <MealPlanMealEditForm
                      meal={meal}
                      disabled={disabled || pending}
                      onSave={(values) => handleUpdateMeal(meal.id, values)}
                      onCancel={() => setEditingMealId(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-muted-foreground shrink-0 text-sm">
                            {MEAL_TYPE_LABELS[meal.meal_type]}
                          </span>
                          <Input
                            id={`meal-name-${meal.id}`}
                            value={mealNames[meal.id] ?? meal.name}
                            placeholder="Meal name"
                            disabled={
                              disabled ||
                              pending ||
                              savingMealNameId === meal.id
                            }
                            onChange={(event) =>
                              setMealNames((current) => ({
                                ...current,
                                [meal.id]: event.target.value,
                              }))
                            }
                            onBlur={() => scheduleMealNameSave(meal.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                event.currentTarget.blur()
                              }
                            }}
                            className="h-8 max-w-md min-w-[10rem] flex-1 font-medium"
                          />
                        </div>
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
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          disabled={disabled || pending}
                          onClick={() => {
                            setExpandedMealId(null)
                            setEditingFood(null)
                            setEditingMealId(meal.id)
                          }}
                          aria-label={`Edit ${meal.name} details`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={disabled || pending}
                          onClick={() => {
                            setEditingMealId(null)
                            setEditingFood(null)
                            setExpandedMealId(isExpanded ? null : meal.id)
                          }}
                        >
                          {isExpanded ? 'Close' : 'Add food'}
                        </Button>
                        <SaveMealToLibraryDialog
                          mealPlanId={mealPlanId}
                          mealId={meal.id}
                          defaultName={meal.name}
                          disabled={disabled || pending}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={disabled || pending}
                          onClick={() => handleDeleteMeal(meal.id)}
                          aria-label={`Delete ${meal.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {meal.foods.length > 0 ? (
                    <ul
                      className={`text-muted-foreground grid gap-1 text-sm ${
                        isEditingMeal ? 'mt-3' : 'mt-2'
                      }`}
                    >
                      {meal.foods.map((food) => {
                        const isEditingFood =
                          editingFood?.mealId === meal.id &&
                          editingFood.foodId === food.id

                        if (isEditingFood) {
                          return (
                            <li key={food.id}>
                              {food.source === 'custom' ? (
                                <ManualFoodEntryForm
                                  key={food.id}
                                  showQuantity
                                  idPrefix={`edit-food-${food.id}`}
                                  disabled={disabled || pending}
                                  submitLabel="Save changes"
                                  defaultValues={{
                                    foodName: food.food_name,
                                    quantityG: food.quantity_g,
                                    caloriesKcal: food.calories_kcal,
                                    proteinG: food.protein_g,
                                    carbsG: food.carbs_g,
                                    fatG: food.fat_g,
                                    fiberG: null,
                                  }}
                                  onCancel={() => setEditingFood(null)}
                                  onSubmit={(values) => {
                                    if (!values.quantityG) return
                                    void handleUpdateMealFood(meal.id, food.id, {
                                      source: 'custom',
                                      externalId: null,
                                      foodName: values.foodName,
                                      quantityG: values.quantityG,
                                      caloriesKcal: values.caloriesKcal,
                                      proteinG: values.proteinG,
                                      carbsG: values.carbsG,
                                      fatG: values.fatG,
                                      sortOrder: food.sort_order,
                                    })
                                  }}
                                />
                              ) : (
                                <MealPlanFoodQuantityEditor
                                  food={food}
                                  disabled={disabled || pending}
                                  onSave={(values) =>
                                    handleUpdateMealFood(meal.id, food.id, values)
                                  }
                                  onCancel={() => setEditingFood(null)}
                                />
                              )}
                            </li>
                          )
                        }

                        return (
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
                            <div className="flex shrink-0 items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0"
                                disabled={disabled || pending}
                                onClick={() =>
                                  setEditingFood({
                                    mealId: meal.id,
                                    foodId: food.id,
                                  })
                                }
                                aria-label={`Edit ${food.food_name}`}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0"
                                disabled={disabled || pending}
                                onClick={() => handleDeleteMealFood(meal.id, food.id)}
                                aria-label={`Remove ${food.food_name}`}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                  {!isEditingMeal && isExpanded ? (
                    <div className="border-border mt-3 border-t pt-3">
                      <MealPlanFoodPicker
                        idPrefix={`meal-food-${meal.id}`}
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
          <EmptyState
            icon={UtensilsCrossed}
            title="No meals yet for this day"
            description="Use the form below to add your first meal with USDA foods or manual entries."
          />
        )}

        <form onSubmit={handleAddMeal} className="border-border grid gap-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Add meal</p>
            <MealLibraryPickerDialog
              mealPlanId={mealPlanId}
              dayId={day.id}
              defaultMealType={mealType}
              disabled={disabled || pending}
            />
          </div>
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

          <MealPlanFoodPicker
            idPrefix={`draft-food-${day.id}`}
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
                    aria-label={`Remove ${food.foodName}`}
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
      {deleteMealConfirm.dialog}
      {deleteFoodConfirm.dialog}
    </Card>
  )
}
