'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { FoodSearchPicker } from '@/components/nutrition/food-search-picker'
import { addDaysToDateKey, formatDayHeader, toDateKey } from '@/lib/calendar'
import {
  formatFoodDiaryEntryMacros,
  groupFoodDiaryByMeal,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
import { formatFoodQuantityLabel, type FoodSelectionSnapshot } from '@/lib/food-catalog'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'
import { mealTypes } from '@/lib/validations/nutrition'
import type { FoodDiaryEntryFormValues } from '@/lib/validations/nutrition'
import type { ClientFoodDiaryEntry } from 'app/types/database'

type FoodDiaryPanelProps = {
  entries: ClientFoodDiaryEntry[]
  logDate?: string
  readOnly?: boolean
  enableDateNavigation?: boolean
  onAdd?: (values: FoodDiaryEntryFormValues) => Promise<{ success: boolean; error?: string }>
  onDelete?: (entryId: string) => Promise<{ success: boolean; error?: string }>
}

function createEmptyEntry(logDate: string): FoodDiaryEntryFormValues {
  return {
    logDate,
    mealType: 'breakfast',
    foodName: '',
    source: null,
    externalId: null,
    quantityG: null,
    caloriesKcal: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    fiberG: null,
  }
}

export function FoodDiaryPanel({
  entries,
  logDate: initialLogDate = toDateKey(new Date()),
  readOnly = false,
  enableDateNavigation = false,
  onAdd,
  onDelete,
}: FoodDiaryPanelProps) {
  const todayKey = toDateKey(new Date())
  const [selectedDate, setSelectedDate] = React.useState(initialLogDate)
  const logDate = enableDateNavigation ? selectedDate : initialLogDate

  React.useEffect(() => {
    if (!enableDateNavigation) {
      setSelectedDate(initialLogDate)
    }
  }, [enableDateNavigation, initialLogDate])
  const [showForm, setShowForm] = React.useState(false)
  const [manualMode, setManualMode] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState<string | null>(null)
  const [formValues, setFormValues] = React.useState(createEmptyEntry(logDate))
  const dateInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setFormValues(createEmptyEntry(logDate))
    setManualMode(false)
  }, [logDate])

  const dayEntries = entries.filter((entry) => entry.log_date === logDate)
  const groups = groupFoodDiaryByMeal(dayEntries)
  const dayTotals = sumFoodDiaryMacros(dayEntries)

  async function submitEntry(values: FoodDiaryEntryFormValues) {
    if (!onAdd) return

    setPending(true)
    const result = await onAdd(values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error ?? 'Could not add food entry.')
      return
    }

    toast.success('Food logged.')
    setFormValues(createEmptyEntry(logDate))
    setManualMode(false)
    setShowForm(false)
  }

  async function handleCatalogAdd(snapshot: FoodSelectionSnapshot) {
    await submitEntry({
      logDate,
      mealType: formValues.mealType,
      foodName: snapshot.foodName,
      source: snapshot.source,
      externalId: snapshot.externalId,
      quantityG: snapshot.quantityG,
      caloriesKcal: snapshot.caloriesKcal,
      proteinG: snapshot.proteinG,
      carbsG: snapshot.carbsG,
      fatG: snapshot.fatG,
      fiberG: null,
    })
  }

  async function handleManualAdd(event: React.FormEvent) {
    event.preventDefault()
    if (!formValues.foodName.trim()) return
    await submitEntry({
      ...formValues,
      source: 'custom',
      externalId: null,
      quantityG: null,
    })
  }

  async function handleDelete(entryId: string) {
    if (!onDelete) return
    setDeletePending(entryId)
    const result = await onDelete(entryId)
    setDeletePending(null)

    if (!result.success) {
      toast.error(result.error ?? 'Could not delete entry.')
      return
    }

    toast.success('Entry removed.')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Food diary</CardTitle>
          <CardDescription>
            {readOnly
              ? 'Review what the client logged, grouped by meal.'
              : 'Search USDA foods or enter a custom item with optional macros.'}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {enableDateNavigation ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setSelectedDate((current) => addDaysToDateKey(current, -1))}
                aria-label="Previous day"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-w-[4.5rem] px-3"
                onClick={() => dateInputRef.current?.showPicker?.()}
              >
                {logDate === todayKey ? 'Today' : formatDayHeader(logDate)}
              </Button>
              <input
                ref={dateInputRef}
                type="date"
                value={logDate}
                max={todayKey}
                onChange={(event) => {
                  if (event.target.value) {
                    setSelectedDate(event.target.value)
                  }
                }}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={logDate >= todayKey}
                onClick={() => setSelectedDate((current) => addDaysToDateKey(current, 1))}
                aria-label="Next day"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
          {!readOnly && onAdd ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm((current) => !current)}
            >
              <Plus className="size-4" />
              Add food
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {showForm && !readOnly ? (
          <div className="border-border bg-muted/20 grid gap-4 rounded-lg border p-4">
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label>Meal</Label>
              <Select
                value={formValues.mealType}
                onValueChange={(value) =>
                  setFormValues((current) => ({
                    ...current,
                    mealType: value as FoodDiaryEntryFormValues['mealType'],
                  }))
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

            {manualMode ? (
              <form onSubmit={handleManualAdd} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="food-name">Food</Label>
                  <Input
                    id="food-name"
                    placeholder="e.g. Homemade smoothie"
                    value={formValues.foodName}
                    onChange={(event) =>
                      setFormValues((current) => ({
                        ...current,
                        foodName: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-5">
                  {(
                    [
                      ['caloriesKcal', 'Calories'],
                      ['proteinG', 'Protein (g)'],
                      ['carbsG', 'Carbs (g)'],
                      ['fatG', 'Fat (g)'],
                      ['fiberG', 'Fiber (g)'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field} className="grid gap-1.5">
                      <Label>{label}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="—"
                        value={formValues[field] ?? ''}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            [field]:
                              event.target.value === ''
                                ? null
                                : Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setManualMode(false)}
                  >
                    Back to search
                  </Button>
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? 'Saving…' : 'Log food'}
                  </Button>
                </div>
              </form>
            ) : (
              <FoodSearchPicker
                disabled={pending}
                addLabel="Log food"
                onAdd={handleCatalogAdd}
                showManualEntry
                onManualEntry={() => setManualMode(true)}
              />
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false)
                  setManualMode(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {groups.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {readOnly
              ? logDate === todayKey
                ? 'No food logged for today.'
                : 'No food logged for this day.'
              : logDate === todayKey
                ? 'No food logged yet today. Tap Add food to start.'
                : 'No food logged for this day.'}
          </p>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <div key={group.mealType}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {group.label}
                  </p>
                  {group.totals.caloriesKcal > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      {Math.round(group.totals.caloriesKcal)} kcal
                    </p>
                  ) : null}
                </div>
                <ul className="grid gap-2">
                  {group.entries.map((entry) => {
                    const macros = formatFoodDiaryEntryMacros(entry)
                    return (
                      <li
                        key={entry.id}
                        className="border-border bg-muted/20 flex items-start justify-between gap-3 rounded-lg border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {entry.quantity_g
                              ? formatFoodQuantityLabel(entry.quantity_g, entry.food_name)
                              : entry.food_name}
                          </p>
                          {macros ? (
                            <p className="text-muted-foreground text-xs">
                              {macros}
                            </p>
                          ) : null}
                        </div>
                        {!readOnly && onDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            disabled={deletePending === entry.id}
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}

            {dayTotals.caloriesKcal > 0 ? (
              <div className="border-border bg-muted/30 rounded-lg border px-4 py-3">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Daily totals
                </p>
                <p className="mt-1 text-sm font-medium">
                  {Math.round(dayTotals.caloriesKcal)} kcal ·{' '}
                  {Math.round(dayTotals.proteinG)}g P ·{' '}
                  {Math.round(dayTotals.carbsG)}g C ·{' '}
                  {Math.round(dayTotals.fatG)}g F
                  {dayTotals.fiberG > 0
                    ? ` · ${Math.round(dayTotals.fiberG)}g fiber`
                    : ''}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
