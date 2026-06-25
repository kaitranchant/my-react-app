'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
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
import { ManualFoodEntryForm } from '@/components/nutrition/manual-food-entry-form'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { addDaysToDateKey, formatDayHeader, toDateKey } from '@/lib/calendar'
import { MacroAdherenceBadges } from '@/components/nutrition/macro-adherence-badges'
import {
  buildMacroAdherenceItems,
  formatFoodDiaryEntryMacros,
  groupFoodDiaryByMeal,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
import { formatFoodQuantityLabel, type FoodSelectionSnapshot } from '@/lib/food-catalog'
import { hasNutritionTargets, MEAL_TYPE_LABELS } from '@/lib/nutrition'
import { mealTypes } from '@/lib/validations/nutrition'
import type { FoodDiaryEntryFormValues } from '@/lib/validations/nutrition'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
} from 'app/types/database'

type FoodDiaryPanelProps = {
  entries: ClientFoodDiaryEntry[]
  logDate?: string
  readOnly?: boolean
  enableDateNavigation?: boolean
  profile?: ClientNutritionProfile | null
  nutritionLog?: ClientNutritionLog | null
  waterMl?: number | null
  fiberG?: number | null
  onAdd?: (values: FoodDiaryEntryFormValues) => Promise<{ success: boolean; error?: string }>
  onDelete?: (entryId: string) => Promise<{ success: boolean; error?: string }>
  onLogDateChange?: (logDate: string) => void
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
  profile = null,
  nutritionLog = null,
  waterMl,
  fiberG,
  onAdd,
  onDelete,
  onLogDateChange,
}: FoodDiaryPanelProps) {
  const todayKey = toDateKey(new Date())
  const [selectedDate, setSelectedDate] = React.useState(initialLogDate)
  const [showForm, setShowForm] = React.useState(false)
  const [manualMode, setManualMode] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState<string | null>(null)
  const [formValues, setFormValues] = React.useState(() =>
    createEmptyEntry(initialLogDate)
  )
  const pendingDeleteEntryId = React.useRef<string | null>(null)
  const dateInputRef = React.useRef<HTMLInputElement>(null)
  const logDate = enableDateNavigation ? selectedDate : initialLogDate

  const deleteConfirm = useConfirmDialog({
    title: 'Remove food entry?',
    description: 'This removes the item from the food diary for this day.',
    confirmLabel: 'Remove entry',
    destructive: true,
    onConfirm: async () => {
      const entryId = pendingDeleteEntryId.current
      if (!entryId || !onDelete) return

      setDeletePending(entryId)
      const result = await onDelete(entryId)
      setDeletePending(null)

      if (!result.success) {
        toast.error(result.error ?? 'Could not delete entry.')
        throw new Error(result.error ?? 'Could not delete entry.')
      }

      toast.success('Entry removed.')
      pendingDeleteEntryId.current = null
    },
  })

  React.useEffect(() => {
    if (!enableDateNavigation) {
      setSelectedDate(initialLogDate)
    }
  }, [enableDateNavigation, initialLogDate])

  const onLogDateChangeRef = React.useRef(onLogDateChange)
  onLogDateChangeRef.current = onLogDateChange

  React.useEffect(() => {
    onLogDateChangeRef.current?.(logDate)
  }, [logDate])

  React.useEffect(() => {
    setFormValues(createEmptyEntry(logDate))
    setManualMode(false)
  }, [logDate])

  const dayEntries = entries.filter((entry) => entry.log_date === logDate)
  const groups = groupFoodDiaryByMeal(dayEntries)
  const dayTotals = sumFoodDiaryMacros(dayEntries)
  const macroItems = buildMacroAdherenceItems(
    dayTotals,
    profile,
    waterMl ?? nutritionLog?.water_ml,
    fiberG ?? nutritionLog?.fiber_g
  )
  const hasFoodLogged =
    dayTotals.caloriesKcal > 0 ||
    dayTotals.proteinG > 0 ||
    dayTotals.carbsG > 0 ||
    dayTotals.fatG > 0
  const showMacroProgress = hasNutritionTargets(profile) || hasFoodLogged
  const dateLabel =
    logDate === todayKey ? 'today' : formatDayHeader(logDate).toLowerCase()

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
      fiberG: snapshot.fiberG ?? null,
    })
  }

  function requestDelete(entryId: string) {
    pendingDeleteEntryId.current = entryId
    deleteConfirm.open()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Food diary</CardTitle>
          <CardDescription>
            {onAdd && readOnly
              ? 'Log food on behalf of the client, or remove incorrect entries.'
              : readOnly
                ? 'Review what the client logged. Remove incorrect entries if needed.'
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
                aria-label={
                  logDate === todayKey
                    ? 'Select date, currently Today'
                    : `Select date, currently ${formatDayHeader(logDate)}`
                }
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
                aria-label="Food diary date"
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
          {onAdd ? (
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
        {showForm && onAdd ? (
          <div className="border-border bg-muted/20 grid gap-4 rounded-lg border p-4">
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label htmlFor="food-diary-meal-type">Meal</Label>
              <Select
                value={formValues.mealType}
                onValueChange={(value) =>
                  setFormValues((current) => ({
                    ...current,
                    mealType: value as FoodDiaryEntryFormValues['mealType'],
                  }))
                }
              >
                <SelectTrigger id="food-diary-meal-type">
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
              <ManualFoodEntryForm
                showFiber
                submitLabel={pending ? 'Saving…' : 'Log food'}
                disabled={pending}
                onBack={() => setManualMode(false)}
                onSubmit={(values) =>
                  void submitEntry({
                    logDate,
                    mealType: formValues.mealType,
                    foodName: values.foodName,
                    source: 'custom',
                    externalId: null,
                    quantityG: values.quantityG,
                    caloriesKcal: values.caloriesKcal,
                    proteinG: values.proteinG,
                    carbsG: values.carbsG,
                    fatG: values.fatG,
                    fiberG: values.fiberG,
                  })
                }
              />
            ) : (
              <FoodSearchPicker
                idPrefix="food-diary"
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
          <EmptyState
            icon={UtensilsCrossed}
            title={
              logDate === todayKey ? 'No food logged yet' : 'No food logged for this day'
            }
            description={
              readOnly && onAdd
                ? logDate === todayKey
                  ? 'Add an entry on behalf of the client.'
                  : 'Nothing was logged for this date.'
                : readOnly
                  ? logDate === todayKey
                    ? 'The client has not logged any food today.'
                    : 'Nothing was logged for this date.'
                  : logDate === todayKey
                    ? 'Search USDA foods or enter a custom item to start your diary.'
                    : 'Add food for this day if you forgot to log it earlier.'
            }
            action={
              onAdd && !showForm
                ? {
                    label: 'Add food',
                    onClick: () => setShowForm(true),
                  }
                : undefined
            }
          />
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
                        {onDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            disabled={deletePending === entry.id}
                            onClick={() => requestDelete(entry.id)}
                            aria-label={`Remove ${entry.food_name}`}
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

          </div>
        )}

        {showMacroProgress ? (
          <div className="border-border border-t pt-4">
            <div className="mb-3 space-y-1">
              <p className="text-sm font-medium">Macro progress</p>
              <p className="text-muted-foreground text-xs">
                {hasNutritionTargets(profile)
                  ? `Food diary vs coach targets for ${dateLabel}.`
                  : `Food logged for ${dateLabel} — set macro targets to track progress.`}
              </p>
            </div>
            {macroItems.length > 0 ? (
              <MacroAdherenceBadges items={macroItems} />
            ) : hasFoodLogged ? (
              <p className="text-muted-foreground text-sm tabular-nums">
                {dayTotals.caloriesKcal > 0
                  ? `${Math.round(dayTotals.caloriesKcal)} kcal`
                  : null}
                {dayTotals.proteinG > 0
                  ? ` · ${Math.round(dayTotals.proteinG)}g protein`
                  : null}
                {dayTotals.carbsG > 0
                  ? ` · ${Math.round(dayTotals.carbsG)}g carbs`
                  : null}
                {dayTotals.fatG > 0 ? ` · ${Math.round(dayTotals.fatG)}g fat` : null}
                {dayTotals.fiberG > 0
                  ? ` · ${Math.round(dayTotals.fiberG)}g fiber`
                  : null}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No food logged for this day yet.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
      {deleteConfirm.dialog}
    </Card>
  )
}
