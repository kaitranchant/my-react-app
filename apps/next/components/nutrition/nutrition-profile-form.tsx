'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'

import { updateClientNutritionProfile } from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  buildDefaultTdeeInputs,
  TdeeCalculatorPanel,
  TdeeResultPreview,
} from '@/components/nutrition/tdee-calculator-card'
import { NutritionGoalContextBanner } from '@/components/nutrition/nutrition-goal-context-banner'
import { buildNutritionGoalContext } from '@/lib/nutrition-goal-context'
import {
  computeMacroPercents,
  gramsFromMacroPercent,
  isMacroSplitBalanced,
  macroPercentFromGrams,
  nutritionProfileToFormValues,
  sumMacroPercentTotal,
  type MacroNutrient,
} from '@/lib/nutrition'
import { calculateTdee } from '@/lib/tdee-calculator'
import { cn } from '@/lib/utils'
import type { NutritionProfileFormValues } from '@/lib/validations/nutrition'
import type {
  BiologicalSex,
  ClientGoal,
  ClientInbodyScan,
  ClientNutritionProfile,
} from 'app/types/database'

type MacroTargetsFormState = Pick<
  NutritionProfileFormValues,
  'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG' | 'waterMl'
>

type NutritionProfileFormProps = {
  clientId: string
  profile: ClientNutritionProfile | null
  goals?: ClientGoal[]
  latestScan?: ClientInbodyScan | null
  biologicalSex?: BiologicalSex | null
}

function macroValuesFromProfile(
  profile: ClientNutritionProfile | null
): MacroTargetsFormState {
  const values = nutritionProfileToFormValues(profile)
  return {
    caloriesKcal: values.caloriesKcal,
    proteinG: values.proteinG,
    carbsG: values.carbsG,
    fatG: values.fatG,
    fiberG: values.fiberG,
    waterMl: values.waterMl,
  }
}

function hasMacroTargets(values: MacroTargetsFormState): boolean {
  return (
    values.caloriesKcal != null ||
    values.proteinG != null ||
    values.carbsG != null ||
    values.fatG != null
  )
}

type TargetEntryMode = 'suggested' | 'manual'
type MacroInputMode = 'grams' | 'percent'

const MACRO_FIELD_CONFIG = [
  {
    field: 'proteinG',
    percentKey: 'protein',
    macro: 'protein' as MacroNutrient,
    label: 'Protein',
    gramPlaceholder: 'e.g. 180',
    inputId: 'nutrition-protein',
  },
  {
    field: 'carbsG',
    percentKey: 'carbs',
    macro: 'carbs' as MacroNutrient,
    label: 'Carbs',
    gramPlaceholder: 'e.g. 250',
    inputId: 'nutrition-carbs',
  },
  {
    field: 'fatG',
    percentKey: 'fat',
    macro: 'fat' as MacroNutrient,
    label: 'Fat',
    gramPlaceholder: 'e.g. 70',
    inputId: 'nutrition-fat',
  },
] as const

function OptionalTargetFields({
  values,
  onUpdate,
}: {
  values: MacroTargetsFormState
  onUpdate: (field: keyof MacroTargetsFormState, rawValue: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="grid gap-2">
          <Label htmlFor="nutrition-fiber">Fiber (g)</Label>
          <Input
            id="nutrition-fiber"
            type="number"
            min="0"
            step="1"
            placeholder="Optional"
            value={values.fiberG ?? ''}
            onChange={(event) => onUpdate('fiberG', event.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="nutrition-water">Water (ml)</Label>
        <Input
          id="nutrition-water"
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 2500"
          value={values.waterMl ?? ''}
          onChange={(event) => onUpdate('waterMl', event.target.value)}
        />
      </div>
    </>
  )
}

function MacroSplitTracker({
  values,
  macroPercents,
}: {
  values: MacroTargetsFormState
  macroPercents: ReturnType<typeof computeMacroPercents>
}) {
  const hasCalories = values.caloriesKcal != null && values.caloriesKcal > 0
  const hasAnyMacro =
    values.proteinG != null || values.carbsG != null || values.fatG != null
  const total = sumMacroPercentTotal(macroPercents)

  if (!hasCalories || !hasAnyMacro || total == null) {
    return (
      <p className="text-muted-foreground text-sm">
        Enter calories and at least one macro to track the split.
      </p>
    )
  }

  const protein = macroPercents.protein ?? 0
  const carbs = macroPercents.carbs ?? 0
  const fat = macroPercents.fat ?? 0
  const balanced = isMacroSplitBalanced(total)
  const macroCalories =
    (values.proteinG ?? 0) * 4 +
    (values.carbsG ?? 0) * 4 +
    (values.fatG ?? 0) * 9

  return (
    <div className="border-border bg-muted/20 grid gap-3 rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={cn(
            'font-medium tabular-nums',
            balanced
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          )}
        >
          {balanced ? '✓ ' : ''}
          {total}% of calorie target
          {balanced ? ' · balanced' : ''}
        </span>
      </div>

      <div className="bg-muted relative h-2.5 overflow-hidden rounded-full">
        <div
          className="flex h-full"
          style={{ width: `${Math.min(total, 100)}%` }}
        >
          {protein > 0 ? (
            <div
              className="bg-sky-500 h-full"
              style={{ width: `${(protein / total) * 100}%` }}
            />
          ) : null}
          {carbs > 0 ? (
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${(carbs / total) * 100}%` }}
            />
          ) : null}
          {fat > 0 ? (
            <div
              className="bg-rose-500 h-full"
              style={{ width: `${(fat / total) * 100}%` }}
            />
          ) : null}
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-sky-500 size-2 rounded-full" />
          Protein {protein}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-amber-500 size-2 rounded-full" />
          Carbs {carbs}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-rose-500 size-2 rounded-full" />
          Fat {fat}%
        </span>
      </div>

      {!balanced ? (
        <p className="text-amber-700 text-xs dark:text-amber-300">
          {total < 99
            ? `${100 - total}% remaining — macro grams account for ${macroCalories.toLocaleString()} kcal of the ${values.caloriesKcal!.toLocaleString()} kcal target.`
            : `${total - 100}% over — macro grams account for ${macroCalories.toLocaleString()} kcal of the ${values.caloriesKcal!.toLocaleString()} kcal target.`}
        </p>
      ) : null}
    </div>
  )
}

function MacroTargetFields({
  values,
  macroPercents,
  onUpdate,
}: {
  values: MacroTargetsFormState
  macroPercents: ReturnType<typeof computeMacroPercents>
  onUpdate: (field: keyof MacroTargetsFormState, rawValue: string) => void
}) {
  const [macroInputMode, setMacroInputMode] = React.useState<MacroInputMode>('grams')
  const hasCalories = values.caloriesKcal != null && values.caloriesKcal > 0

  function updateMacroPercent(macro: MacroNutrient, rawPercent: string) {
    if (!hasCalories) return

    if (rawPercent === '') {
      const field =
        macro === 'protein' ? 'proteinG' : macro === 'carbs' ? 'carbsG' : 'fatG'
      onUpdate(field, '')
      return
    }

    const percent = Number(rawPercent)
    if (!Number.isFinite(percent) || percent < 0) return

    const grams = gramsFromMacroPercent(values.caloriesKcal!, percent, macro)
    const field =
      macro === 'protein' ? 'proteinG' : macro === 'carbs' ? 'carbsG' : 'fatG'
    onUpdate(field, String(grams))
  }

  function handleCaloriesChange(rawValue: string) {
    if (
      macroInputMode === 'percent' &&
      values.caloriesKcal != null &&
      values.caloriesKcal > 0 &&
      rawValue !== ''
    ) {
      const nextCalories = Number(rawValue)
      if (Number.isFinite(nextCalories) && nextCalories > 0) {
        const currentCalories = values.caloriesKcal
        for (const config of MACRO_FIELD_CONFIG) {
          const grams = values[config.field]
          if (grams == null) continue
          const percent = macroPercentFromGrams(
            currentCalories,
            grams,
            config.macro
          )
          const nextGrams = gramsFromMacroPercent(
            nextCalories,
            percent,
            config.macro
          )
          if (nextGrams !== grams) {
            onUpdate(config.field, String(nextGrams))
          }
        }
      }
    }

    onUpdate('caloriesKcal', rawValue)
  }

  function MacroInputModeToggle() {
    return (
      <button
        type="button"
        className="text-primary text-xs font-medium underline-offset-2 hover:underline"
        onClick={() =>
          setMacroInputMode((current) =>
            current === 'grams' ? 'percent' : 'grams'
          )
        }
      >
        {macroInputMode === 'grams' ? 'Measure by %' : 'Measure by grams'}
      </button>
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="nutrition-calories">Calories (kcal)</Label>
        <Input
          id="nutrition-calories"
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 2500"
          value={values.caloriesKcal ?? ''}
          onChange={(event) => handleCaloriesChange(event.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {MACRO_FIELD_CONFIG.map((config, index) => {
          const grams = values[config.field]
          const percent =
            macroPercents[config.percentKey as keyof typeof macroPercents]

          if (macroInputMode === 'percent') {
            const displayPercent =
              hasCalories && grams != null
                ? macroPercentFromGrams(
                    values.caloriesKcal!,
                    grams,
                    config.macro
                  )
                : percent

            return (
              <div key={config.field} className="grid gap-2">
                <Label htmlFor={config.inputId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {config.label} (%)
                  {index === 0 ? <MacroInputModeToggle /> : null}
                </Label>
                <Input
                  id={config.inputId}
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="e.g. 30"
                  disabled={!hasCalories}
                  value={displayPercent ?? ''}
                  onChange={(event) =>
                    updateMacroPercent(config.macro, event.target.value)
                  }
                />
                {grams != null ? (
                  <p className="text-muted-foreground text-xs tabular-nums">
                    = {grams}g
                  </p>
                ) : null}
              </div>
            )
          }

          return (
            <div key={config.field} className="grid gap-2">
              <Label htmlFor={config.inputId} className="flex items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {config.label} (g)
                  {index === 0 ? <MacroInputModeToggle /> : null}
                </span>
                {percent != null ? (
                  <span className="text-primary text-xs font-medium tabular-nums">
                    {percent}%
                  </span>
                ) : null}
              </Label>
              <Input
                id={config.inputId}
                type="number"
                min="0"
                step="1"
                placeholder={config.gramPlaceholder}
                value={grams ?? ''}
                onChange={(event) => onUpdate(config.field, event.target.value)}
              />
            </div>
          )
        })}
        <div className="grid gap-2">
          <Label htmlFor="nutrition-fiber">Fiber (g)</Label>
          <Input
            id="nutrition-fiber"
            type="number"
            min="0"
            step="1"
            placeholder="Optional"
            value={values.fiberG ?? ''}
            onChange={(event) => onUpdate('fiberG', event.target.value)}
          />
        </div>
      </div>

      {macroInputMode === 'percent' && !hasCalories ? (
        <p className="text-muted-foreground text-xs">
          Set calories first to adjust macros by percentage.
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="nutrition-water">Water (ml)</Label>
        <Input
          id="nutrition-water"
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 2500"
          value={values.waterMl ?? ''}
          onChange={(event) => onUpdate('waterMl', event.target.value)}
        />
      </div>

      <MacroSplitTracker values={values} macroPercents={macroPercents} />
    </div>
  )
}

export function NutritionProfileForm({
  clientId,
  profile,
  goals = [],
  latestScan = null,
  biologicalSex = null,
}: NutritionProfileFormProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [tdeeExpanded, setTdeeExpanded] = React.useState(false)
  const [entryMode, setEntryMode] = React.useState<TargetEntryMode>(() =>
    hasMacroTargets(macroValuesFromProfile(profile)) ? 'manual' : 'suggested'
  )
  const [values, setValues] = React.useState<MacroTargetsFormState>(
    macroValuesFromProfile(profile)
  )

  const goalContext = buildNutritionGoalContext(goals, latestScan)

  const [tdeeInputs, setTdeeInputs] = React.useState(() =>
    buildDefaultTdeeInputs({
      defaultWeightLbs: latestScan?.weight_lbs,
      defaultSex: biologicalSex,
      defaultGoal: goalContext?.suggestedTdeeGoal,
    })
  )

  React.useEffect(() => {
    const nextValues = macroValuesFromProfile(profile)
    setValues(nextValues)
    if (hasMacroTargets(nextValues)) {
      setEntryMode('manual')
    }
  }, [profile])

  React.useEffect(() => {
    setTdeeInputs(
      buildDefaultTdeeInputs({
        defaultWeightLbs: latestScan?.weight_lbs,
        defaultSex: biologicalSex,
        defaultGoal: goalContext?.suggestedTdeeGoal,
      })
    )
  }, [latestScan?.weight_lbs, biologicalSex, goalContext?.suggestedTdeeGoal])

  const tdeeResult = calculateTdee(tdeeInputs)
  const hasPersistedTargets = hasMacroTargets(macroValuesFromProfile(profile))
  const useSuggestedEntry = !hasPersistedTargets && entryMode === 'suggested'
  const macroPercents = computeMacroPercents({
    calories_kcal: values.caloriesKcal,
    protein_g: values.proteinG,
    carbs_g: values.carbsG,
    fat_g: values.fatG,
  } as ClientNutritionProfile)

  function applyTdeeTargets(suggested: {
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }) {
    setValues((current) => ({
      ...current,
      caloriesKcal: suggested.caloriesKcal,
      proteinG: suggested.proteinG,
      carbsG: suggested.carbsG,
      fatG: suggested.fatG,
    }))
    setEntryMode('manual')
    setTdeeExpanded(false)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const targetsToSave = useSuggestedEntry
      ? {
          ...values,
          caloriesKcal: tdeeResult.targetCalories,
          proteinG: tdeeResult.suggestedProteinG,
          carbsG: tdeeResult.suggestedCarbsG,
          fatG: tdeeResult.suggestedFatG,
        }
      : values

    const result = await updateClientNutritionProfile(clientId, {
      ...nutritionProfileToFormValues(profile),
      ...targetsToSave,
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Nutrition targets saved.')
    router.refresh()
  }

  function updateNumberField(
    field: keyof MacroTargetsFormState,
    rawValue: string
  ) {
    setValues((current) => ({
      ...current,
      [field]: rawValue === '' ? null : Number(rawValue),
    }))
  }

  return (
    <div className="grid gap-4">
      {goalContext ? <NutritionGoalContextBanner context={goalContext} /> : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Macro targets</CardTitle>
            <CardDescription>
              {hasPersistedTargets
                ? 'Set daily calorie, macro, fiber, and water targets for this client.'
                : 'Start from a TDEE estimate or enter targets manually.'}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-primary h-auto shrink-0 px-0"
            onClick={() => setTdeeExpanded((current) => !current)}
          >
            {tdeeExpanded ? 'Hide calculator' : 'Recalculate TDEE'}
            <ArrowUpRight className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {tdeeExpanded ? (
            <TdeeCalculatorPanel
              inputs={tdeeInputs}
              onInputsChange={setTdeeInputs}
              defaultBmr={latestScan?.basal_metabolic_rate_kcal}
              defaultGoal={goalContext?.suggestedTdeeGoal}
              onApply={applyTdeeTargets}
            />
          ) : null}

          <form onSubmit={handleSubmit} className="grid gap-4">
            {hasPersistedTargets ? (
              <MacroTargetFields
                values={values}
                macroPercents={macroPercents}
                onUpdate={updateNumberField}
              />
            ) : (
              <>
                <Tabs
                  value={entryMode}
                  onValueChange={(value) =>
                    setEntryMode(value as TargetEntryMode)
                  }
                >
                  <TabsList>
                    <TabsTrigger value="suggested">Suggested</TabsTrigger>
                    <TabsTrigger value="manual">Enter manually</TabsTrigger>
                  </TabsList>
                  <TabsContent value="suggested" className="mt-4">
                    <TdeeResultPreview
                      result={tdeeResult}
                      displayBmr={latestScan?.basal_metabolic_rate_kcal}
                      onApply={() =>
                        applyTdeeTargets({
                          caloriesKcal: tdeeResult.targetCalories,
                          proteinG: tdeeResult.suggestedProteinG,
                          carbsG: tdeeResult.suggestedCarbsG,
                          fatG: tdeeResult.suggestedFatG,
                        })
                      }
                    />
                  </TabsContent>
                  <TabsContent value="manual" className="mt-4">
                    <MacroTargetFields
                      values={values}
                      macroPercents={macroPercents}
                      onUpdate={updateNumberField}
                    />
                  </TabsContent>
                </Tabs>
                {entryMode === 'suggested' ? (
                  <OptionalTargetFields
                    values={values}
                    onUpdate={updateNumberField}
                  />
                ) : null}
              </>
            )}

            <div className="flex justify-end sm:justify-end">
              <Button type="submit" disabled={pending}>
                {pending
                  ? 'Saving…'
                  : useSuggestedEntry
                    ? 'Save suggested targets'
                    : 'Save targets'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
