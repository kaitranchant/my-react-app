'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Search } from 'lucide-react'
import { toast } from 'sonner'

import { getLibraryMealsForPicker } from '@/app/(dashboard)/library/meals/actions'
import { addLibraryMealToPlanDay } from '@/app/(dashboard)/library/meal-plans/[planId]/actions'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatFoodMacrosShort } from '@/lib/food-catalog'
import {
  MEAL_LIBRARY_CALORIE_RANGES,
  MEAL_LIBRARY_CARBS_RANGES,
  MEAL_LIBRARY_FAT_RANGES,
  MEAL_LIBRARY_PROTEIN_RANGES,
  type MealLibraryCalorieRangeKey,
  type MealLibraryCarbsRangeKey,
  type MealLibraryFatRangeKey,
  type MealLibraryProteinRangeKey,
} from '@/lib/meal-library-filters'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'
import { mealTypes } from '@/lib/validations/nutrition'
import type { LibraryMeal, MealType } from 'app/types/database'

type MealLibraryPickerDialogProps = {
  mealPlanId: string
  dayId: string
  defaultMealType?: MealType
  disabled?: boolean
  onAdded?: () => void
}

export function MealLibraryPickerDialog({
  mealPlanId,
  dayId,
  defaultMealType = 'breakfast',
  disabled = false,
  onAdded,
}: MealLibraryPickerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [meals, setMeals] = React.useState<LibraryMeal[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [mealType, setMealType] = React.useState<MealType>(defaultMealType)
  const [calorieRange, setCalorieRange] = React.useState<
    MealLibraryCalorieRangeKey | 'all'
  >('all')
  const [proteinRange, setProteinRange] = React.useState<
    MealLibraryProteinRangeKey | 'all'
  >('all')
  const [carbsRange, setCarbsRange] = React.useState<
    MealLibraryCarbsRangeKey | 'all'
  >('all')
  const [fatRange, setFatRange] = React.useState<MealLibraryFatRangeKey | 'all'>(
    'all'
  )
  const [query, setQuery] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setMealType(defaultMealType)
    setCalorieRange('all')
    setProteinRange('all')
    setCarbsRange('all')
    setFatRange('all')
    setQuery('')
    setSelectedId(null)
  }, [open, defaultMealType])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setSelectedId(null)

    void getLibraryMealsForPicker({
      mealType,
      calorieRange: calorieRange === 'all' ? undefined : calorieRange,
      proteinRange: proteinRange === 'all' ? undefined : proteinRange,
      carbsRange: carbsRange === 'all' ? undefined : carbsRange,
      fatRange: fatRange === 'all' ? undefined : fatRange,
      q: query.trim() || undefined,
    }).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.success) {
        toast.error(result.error)
        setMeals([])
        return
      }
      setMeals(result.meals)
    })

    return () => {
      cancelled = true
    }
  }, [open, mealType, calorieRange, proteinRange, carbsRange, fatRange, query])

  async function handleConfirm() {
    if (!selectedId) {
      toast.error('Select a meal from your library.')
      return
    }

    setPending(true)
    const result = await addLibraryMealToPlanDay(mealPlanId, dayId, selectedId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Meal added from library.')
    setOpen(false)
    onAdded?.()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <BookOpen className="size-4" />
          From library
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add from meal library</DialogTitle>
          <DialogDescription>
            Choose a saved meal to copy into this day.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Meal type</Label>
              <Select
                value={mealType}
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
              <Label>Calories</Label>
              <Select
                value={calorieRange}
                onValueChange={(value) =>
                  setCalorieRange(value as MealLibraryCalorieRangeKey | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All calories</SelectItem>
                  {MEAL_LIBRARY_CALORIE_RANGES.map((range) => (
                    <SelectItem key={range.key} value={range.key}>
                      {range.label} kcal
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Protein</Label>
              <Select
                value={proteinRange}
                onValueChange={(value) =>
                  setProteinRange(value as MealLibraryProteinRangeKey | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All protein</SelectItem>
                  {MEAL_LIBRARY_PROTEIN_RANGES.map((range) => (
                    <SelectItem key={range.key} value={range.key}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Carbs</Label>
              <Select
                value={carbsRange}
                onValueChange={(value) =>
                  setCarbsRange(value as MealLibraryCarbsRangeKey | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All carbs</SelectItem>
                  {MEAL_LIBRARY_CARBS_RANGES.map((range) => (
                    <SelectItem key={range.key} value={range.key}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Fat</Label>
              <Select
                value={fatRange}
                onValueChange={(value) =>
                  setFatRange(value as MealLibraryFatRangeKey | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fat</SelectItem>
                  {MEAL_LIBRARY_FAT_RANGES.map((range) => (
                    <SelectItem key={range.key} value={range.key}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search meals…"
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border">
            {loading ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                Loading meals…
              </p>
            ) : meals.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                No active meals match these filters.
              </p>
            ) : (
              <ul>
                {meals.map((meal) => {
                  const selected = selectedId === meal.id
                  return (
                    <li key={meal.id}>
                      <button
                        type="button"
                        className={
                          selected
                            ? 'bg-brand/10 border-brand hover:bg-brand/10 flex w-full flex-col gap-0.5 border-l-2 px-4 py-3 text-left'
                            : 'hover:bg-muted/50 flex w-full flex-col gap-0.5 border-l-2 border-transparent px-4 py-3 text-left'
                        }
                        onClick={() => setSelectedId(meal.id)}
                      >
                        <span className="text-sm font-medium">{meal.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {MEAL_TYPE_LABELS[meal.meal_type]}
                          {meal.calories_kcal != null
                            ? ` · ${formatFoodMacrosShort({
                                caloriesKcal: meal.calories_kcal,
                                proteinG: meal.protein_g ?? 0,
                                carbsG: meal.carbs_g ?? 0,
                                fatG: meal.fat_g ?? 0,
                              })}`
                            : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={pending || !selectedId}
            onClick={() => void handleConfirm()}
          >
            {pending ? 'Adding…' : 'Add meal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
