'use client'

import * as React from 'react'
import { Calculator } from 'lucide-react'
import { AlertTriangle } from 'lucide-react'

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
import {
  ACTIVITY_LEVEL_LABELS,
  calculateTdee,
  formatMacroWithPercent,
  NUTRITION_GOAL_LABELS,
  type ActivityLevel,
  type NutritionGoal,
  type TdeeInputs,
  type TdeeResult,
} from '@/lib/tdee-calculator'
import type { BiologicalSex } from 'app/types/database'

export function buildDefaultTdeeInputs(options: {
  defaultWeightLbs?: number | null
  defaultSex?: BiologicalSex | null
  defaultGoal?: NutritionGoal | null
}): TdeeInputs {
  return {
    weightLbs: options.defaultWeightLbs ?? 170,
    heightIn: 68,
    age: 30,
    sex: options.defaultSex === 'female' ? 'female' : 'male',
    activityLevel: 'moderate',
    goal: options.defaultGoal ?? 'maintain',
  }
}

type TdeeResultPreviewProps = {
  result: TdeeResult
  displayBmr?: number | null
  onApply: () => void
  applyLabel?: string
}

export function TdeeResultPreview({
  result,
  displayBmr,
  onApply,
  applyLabel = 'Use suggested targets',
}: TdeeResultPreviewProps) {
  const bmr = displayBmr ?? result.bmr

  return (
    <div className="border-border bg-muted/20 grid gap-4 rounded-lg border border-dashed p-4">
      <div>
        <p className="text-sm font-medium">Suggested starting targets</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Based on the TDEE calculator defaults. Expand recalculate to adjust
          inputs, then apply.
        </p>
      </div>
      <div className="bg-background rounded-lg border px-4 py-3 text-sm">
        <p>
          <span className="text-muted-foreground">BMR:</span>{' '}
          <span className="font-medium">{bmr} kcal</span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className="text-muted-foreground">TDEE:</span>{' '}
          <span className="font-medium">{result.tdee} kcal</span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className="text-muted-foreground">Target:</span>{' '}
          <span className="font-medium">{result.targetCalories} kcal</span>
        </p>
        <ul className="text-muted-foreground mt-2 grid gap-1 sm:grid-cols-3">
          <li>
            {formatMacroWithPercent(
              result.suggestedProteinG,
              result.proteinPercent,
              'protein'
            )}
          </li>
          <li>
            {formatMacroWithPercent(
              result.suggestedCarbsG,
              result.carbsPercent,
              'carbs'
            )}
          </li>
          <li>
            {formatMacroWithPercent(
              result.suggestedFatG,
              result.fatPercent,
              'fat'
            )}
          </li>
        </ul>
      </div>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onApply}>
          {applyLabel}
        </Button>
      </div>
    </div>
  )
}

type TdeeCalculatorPanelProps = {
  inputs: TdeeInputs
  onInputsChange: (inputs: TdeeInputs) => void
  defaultBmr?: number | null
  defaultGoal?: NutritionGoal | null
  onApply: (values: {
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }) => void
}

export function TdeeCalculatorPanel({
  inputs,
  onInputsChange,
  defaultBmr,
  defaultGoal,
  onApply,
}: TdeeCalculatorPanelProps) {
  const result = calculateTdee(inputs)
  const displayBmr = defaultBmr ?? result.bmr
  const goalMismatch =
    defaultGoal != null && inputs.goal !== defaultGoal

  return (
    <div className="border-border bg-muted/10 grid gap-4 rounded-lg border border-dashed p-4">
      <div className="flex items-center gap-2">
        <Calculator className="text-muted-foreground size-4" />
        <p className="text-sm font-medium">TDEE calculator</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="tdee-weight">Weight (lbs)</Label>
          <Input
            id="tdee-weight"
            type="number"
            min="50"
            value={inputs.weightLbs}
            onChange={(e) =>
              onInputsChange({
                ...inputs,
                weightLbs: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tdee-height">Height (in)</Label>
          <Input
            id="tdee-height"
            type="number"
            min="48"
            value={inputs.heightIn}
            onChange={(e) =>
              onInputsChange({
                ...inputs,
                heightIn: Number(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tdee-age">Age</Label>
          <Input
            id="tdee-age"
            type="number"
            min="14"
            max="100"
            value={inputs.age}
            onChange={(e) =>
              onInputsChange({
                ...inputs,
                age: Number(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>Sex</Label>
          <Select
            value={inputs.sex}
            onValueChange={(value: 'male' | 'female') =>
              onInputsChange({ ...inputs, sex: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Activity level</Label>
          <Select
            value={inputs.activityLevel}
            onValueChange={(value: ActivityLevel) =>
              onInputsChange({ ...inputs, activityLevel: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map(
                (level) => (
                  <SelectItem key={level} value={level}>
                    {ACTIVITY_LEVEL_LABELS[level]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Goal</Label>
          <Select
            value={inputs.goal}
            onValueChange={(value: NutritionGoal) =>
              onInputsChange({ ...inputs, goal: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(NUTRITION_GOAL_LABELS) as NutritionGoal[]).map(
                (goal) => (
                  <SelectItem key={goal} value={goal}>
                    {NUTRITION_GOAL_LABELS[goal]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {goalMismatch ? (
        <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            The selected goal ({NUTRITION_GOAL_LABELS[inputs.goal]}) doesn&apos;t
            match the client&apos;s active composition goal (
            {NUTRITION_GOAL_LABELS[defaultGoal]}). Targets may not align with
            their current phase.
          </p>
        </div>
      ) : null}

      <div className="bg-muted/40 rounded-lg border px-4 py-3 text-sm">
        <p>
          <span className="text-muted-foreground">BMR:</span>{' '}
          <span className="font-medium">{displayBmr} kcal</span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className="text-muted-foreground">TDEE:</span>{' '}
          <span className="font-medium">{result.tdee} kcal</span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className="text-muted-foreground">Target:</span>{' '}
          <span className="font-medium">{result.targetCalories} kcal</span>
        </p>
        <ul className="text-muted-foreground mt-2 grid gap-1">
          <li>
            {formatMacroWithPercent(
              result.suggestedProteinG,
              result.proteinPercent,
              'protein'
            )}
          </li>
          <li>
            {formatMacroWithPercent(
              result.suggestedCarbsG,
              result.carbsPercent,
              'carbs'
            )}
          </li>
          <li>
            {formatMacroWithPercent(
              result.suggestedFatG,
              result.fatPercent,
              'fat'
            )}
          </li>
        </ul>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            onApply({
              caloriesKcal: result.targetCalories,
              proteinG: result.suggestedProteinG,
              carbsG: result.suggestedCarbsG,
              fatG: result.suggestedFatG,
            })
          }
        >
          Apply to targets
        </Button>
      </div>
    </div>
  )
}
