'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  addLibraryMealFood,
  deleteLibraryMealFood,
  updateLibraryMealFood,
  updateLibraryMealRecord,
} from '@/app/(dashboard)/library/meals/[mealId]/actions'
import { MealFoodPicker } from '@/components/nutrition/meal-food-picker'
import { MacroTotalsBadges } from '@/components/nutrition/macro-totals-badges'
import { Button } from '@/components/ui/button'
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
import { mealTypes, type MealPlanMealFoodFormValues } from '@/lib/validations/nutrition'
import type { LibraryMealFood, LibraryMealWithFoods } from 'app/types/database'

type LibraryMealEditorProps = {
  meal: LibraryMealWithFoods
}

function snapshotToFoodValues(
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

function libraryFoodToFormValues(food: LibraryMealFood): MealPlanMealFoodFormValues {
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

function LibraryMealFoodQuantityEditor({
  food,
  disabled,
  onSave,
  onCancel,
}: {
  food: LibraryMealFood
  disabled: boolean
  onSave: (values: MealPlanMealFoodFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [quantityG, setQuantityG] = React.useState(String(food.quantity_g))
  const [saving, setSaving] = React.useState(false)
  const parsedQuantity = Number.parseFloat(quantityG)
  const quantityIsValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0

  const preview = React.useMemo(() => {
    if (!quantityIsValid) return null
    return rescaleFoodMacrosByQuantity(
      {
        quantityG: food.quantity_g,
        caloriesKcal: food.calories_kcal ?? 0,
        proteinG: food.protein_g ?? 0,
        carbsG: food.carbs_g ?? 0,
        fatG: food.fat_g ?? 0,
      },
      parsedQuantity
    )
  }, [food, parsedQuantity, quantityIsValid])

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
      ...libraryFoodToFormValues(food),
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

export function LibraryMealEditor({ meal: initialMeal }: LibraryMealEditorProps) {
  const router = useRouter()
  const [meal, setMeal] = React.useState(initialMeal)
  const [name, setName] = React.useState(initialMeal.name)
  const [mealType, setMealType] = React.useState(initialMeal.meal_type)
  const [description, setDescription] = React.useState(initialMeal.description ?? '')
  const [pending, setPending] = React.useState(false)
  const [editingFoodId, setEditingFoodId] = React.useState<string | null>(null)
  const [metadataDirty, setMetadataDirty] = React.useState(false)

  React.useEffect(() => {
    setMeal(initialMeal)
    setName(initialMeal.name)
    setMealType(initialMeal.meal_type)
    setDescription(initialMeal.description ?? '')
    setMetadataDirty(false)
  }, [initialMeal])

  const mealTotals = React.useMemo(
    () => sumMealPlanMealFoodMacros(meal.foods),
    [meal.foods]
  )

  async function handleSaveMetadata() {
    setPending(true)
    const result = await updateLibraryMealRecord(meal.id, {
      name: name.trim(),
      mealType,
      description: description.trim() || null,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setMeal((current) => ({
      ...current,
      name: name.trim(),
      meal_type: mealType,
      description: description.trim() || null,
    }))
    setMetadataDirty(false)
    toast.success('Meal updated.')
    router.refresh()
  }

  async function handleAddFood(snapshot: FoodSelectionSnapshot) {
    setPending(true)
    const result = await addLibraryMealFood(
      meal.id,
      snapshotToFoodValues(snapshot, meal.foods.length)
    )
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Food added.')
    router.refresh()
  }

  async function handleUpdateFood(
    foodId: string,
    values: MealPlanMealFoodFormValues
  ) {
    setPending(true)
    const result = await updateLibraryMealFood(meal.id, foodId, values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setEditingFoodId(null)
    toast.success('Food updated.')
    router.refresh()
  }

  async function handleDeleteFood(foodId: string) {
    setPending(true)
    const result = await deleteLibraryMealFood(meal.id, foodId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Food removed.')
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <div className="border-border grid gap-4 rounded-lg border p-4">
        <p className="text-sm font-medium">Meal details</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="library-meal-name">Name</Label>
            <Input
              id="library-meal-name"
              value={name}
              disabled={pending}
              onChange={(event) => {
                setName(event.target.value)
                setMetadataDirty(true)
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Meal type</Label>
            <Select
              value={mealType}
              disabled={pending}
              onValueChange={(value) => {
                setMealType(value as typeof mealType)
                setMetadataDirty(true)
              }}
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
        </div>
        <div className="grid gap-2">
          <Label htmlFor="library-meal-description">Description</Label>
          <Textarea
            id="library-meal-description"
            rows={2}
            value={description}
            disabled={pending}
            onChange={(event) => {
              setDescription(event.target.value)
              setMetadataDirty(true)
            }}
          />
        </div>
        {metadataDirty ? (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={pending || !name.trim()}
              onClick={() => void handleSaveMetadata()}
            >
              Save details
            </Button>
          </div>
        ) : null}
      </div>

      <div className="border-border grid gap-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Foods</p>
          {mealTotals.caloriesKcal != null ? (
            <MacroTotalsBadges
              totals={{
                caloriesKcal: mealTotals.caloriesKcal,
                proteinG: mealTotals.proteinG ?? 0,
                carbsG: mealTotals.carbsG ?? 0,
                fatG: mealTotals.fatG ?? 0,
              }}
              label="Meal total"
            />
          ) : null}
        </div>

        {meal.foods.length > 0 ? (
          <ul className="grid gap-2">
            {meal.foods.map((food) => (
              <li key={food.id} className="border-border rounded-lg border p-3">
                {editingFoodId === food.id ? (
                  <LibraryMealFoodQuantityEditor
                    food={food}
                    disabled={pending}
                    onSave={(values) => handleUpdateFood(food.id, values)}
                    onCancel={() => setEditingFoodId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-medium">{food.food_name}</p>
                      <p className="text-muted-foreground">
                        {formatFoodQuantityLabel(food.quantity_g, food.food_name)}
                        {food.calories_kcal != null
                          ? ` — ${formatFoodMacrosShort({
                              caloriesKcal: food.calories_kcal,
                              proteinG: food.protein_g ?? 0,
                              carbsG: food.carbs_g ?? 0,
                              fatG: food.fat_g ?? 0,
                            })}`
                          : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={pending}
                        onClick={() => setEditingFoodId(food.id)}
                        aria-label={`Edit ${food.food_name}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={pending}
                        onClick={() => void handleDeleteFood(food.id)}
                        aria-label={`Remove ${food.food_name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">No foods yet.</p>
        )}

        <MealFoodPicker
          idPrefix={`library-meal-${meal.id}`}
          disabled={pending}
          addLabel="Add to meal"
          onAdd={handleAddFood}
        />
      </div>
    </div>
  )
}
