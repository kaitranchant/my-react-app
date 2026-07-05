'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { createLibraryMealRecord } from '@/app/(dashboard)/library/meals/actions'
import { MealFoodPicker } from '@/components/nutrition/meal-food-picker'
import { MacroTotalsBadges } from '@/components/nutrition/macro-totals-badges'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatFoodMacrosShort,
  formatFoodQuantityLabel,
  type FoodSelectionSnapshot,
} from '@/lib/food-catalog'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'
import { sumMealPlanMealFoodMacros } from '@/lib/meal-plan-meal-foods'
import { libraryMealFormDefaults } from '@/lib/validations/meal-library'
import {
  mealTypes,
  type MealPlanMealFoodFormValues,
} from '@/lib/validations/nutrition'
import type { MealType } from 'app/types/database'

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

export function AddMealLibraryButton() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [name, setName] = React.useState('')
  const [mealType, setMealType] = React.useState<MealType>(
    libraryMealFormDefaults.mealType
  )
  const [description, setDescription] = React.useState('')
  const [draftFoods, setDraftFoods] = React.useState<MealPlanMealFoodFormValues[]>(
    []
  )

  React.useEffect(() => {
    if (!open) return
    setName('')
    setMealType(libraryMealFormDefaults.mealType)
    setDescription('')
    setDraftFoods([])
  }, [open])

  const draftTotals = React.useMemo(() => {
    if (draftFoods.length === 0) return null
    return sumMealPlanMealFoodMacros(
      draftFoods.map((food) => ({
        calories_kcal: food.caloriesKcal,
        protein_g: food.proteinG,
        carbs_g: food.carbsG,
        fat_g: food.fatG,
      }))
    )
  }, [draftFoods])

  function handleDraftFoodAdd(snapshot: FoodSelectionSnapshot) {
    setDraftFoods((current) => [
      ...current,
      snapshotToFoodValues(snapshot, current.length),
    ])
  }

  function handleRemoveDraftFood(index: number) {
    setDraftFoods((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!name.trim()) {
      toast.error('Enter a meal name.')
      return
    }

    if (draftFoods.length === 0) {
      toast.error('Add at least one food.')
      return
    }

    setPending(true)
    const result = await createLibraryMealRecord({
      name: name.trim(),
      description: description.trim() || undefined,
      mealType,
      status: 'active',
      foods: draftFoods,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Meal saved to library.')
    setOpen(false)
    router.push(`/library/meals/${result.mealId}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add meal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add meal to library</DialogTitle>
          <DialogDescription>
            Save a reusable meal with foods. You can filter by type and calories
            when building meal plans.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="library-meal-create-name">Name</Label>
            <Input
              id="library-meal-create-name"
              value={name}
              disabled={pending}
              placeholder="e.g. Greek yogurt bowl"
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Meal type</Label>
            <Select
              value={mealType}
              disabled={pending}
              onValueChange={(value) => setMealType(value as MealType)}
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
            <Label htmlFor="library-meal-create-description">Description</Label>
            <Textarea
              id="library-meal-create-description"
              rows={2}
              value={description}
              disabled={pending}
              placeholder="Optional prep notes"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Foods</Label>
            <MealFoodPicker
              idPrefix="library-meal-create"
              disabled={pending}
              onAdd={handleDraftFoodAdd}
            />
            {draftFoods.length > 0 ? (
              <div className="grid gap-2">
                {draftTotals ? (
                  <MacroTotalsBadges
                    totals={{
                      caloriesKcal: draftTotals.caloriesKcal ?? 0,
                      proteinG: draftTotals.proteinG ?? 0,
                      carbsG: draftTotals.carbsG ?? 0,
                      fatG: draftTotals.fatG ?? 0,
                    }}
                    label="Meal total"
                  />
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
                        disabled={pending}
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
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save meal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
