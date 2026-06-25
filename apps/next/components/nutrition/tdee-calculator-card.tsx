'use client'

import * as React from 'react'
import { Calculator } from 'lucide-react'

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
import {
  ACTIVITY_LEVEL_LABELS,
  calculateTdee,
  formatMacroWithPercent,
  NUTRITION_GOAL_LABELS,
  type ActivityLevel,
  type NutritionGoal,
  type TdeeInputs,
} from '@/lib/tdee-calculator'
import type { BiologicalSex } from 'app/types/database'

type TdeeCalculatorCardProps = {
  defaultWeightLbs?: number | null
  defaultSex?: BiologicalSex | null
  defaultBmr?: number | null
  onApply: (values: {
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }) => void
}

export function TdeeCalculatorCard({
  defaultWeightLbs,
  defaultSex,
  defaultBmr,
  onApply,
}: TdeeCalculatorCardProps) {
  const [inputs, setInputs] = React.useState<TdeeInputs>({
    weightLbs: defaultWeightLbs ?? 170,
    heightIn: 68,
    age: 30,
    sex: defaultSex === 'female' ? 'female' : 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
  })

  React.useEffect(() => {
    if (defaultWeightLbs != null) {
      setInputs((current) => ({ ...current, weightLbs: defaultWeightLbs }))
    }
    if (defaultSex === 'female' || defaultSex === 'male') {
      setInputs((current) => ({ ...current, sex: defaultSex }))
    }
  }, [defaultWeightLbs, defaultSex])

  const result = calculateTdee(inputs)
  const displayBmr = defaultBmr ?? result.bmr

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="text-muted-foreground size-4" />
          <CardTitle className="text-base">TDEE calculator</CardTitle>
        </div>
        <CardDescription>
          Estimate a starting point from client stats, then adjust as needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="tdee-weight">Weight (lbs)</Label>
            <Input
              id="tdee-weight"
              type="number"
              min="50"
              value={inputs.weightLbs}
              onChange={(e) =>
                setInputs((c) => ({
                  ...c,
                  weightLbs: Number(e.target.value) || 0,
                }))
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
                setInputs((c) => ({
                  ...c,
                  heightIn: Number(e.target.value) || 0,
                }))
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
                setInputs((c) => ({
                  ...c,
                  age: Number(e.target.value) || 0,
                }))
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
                setInputs((c) => ({ ...c, sex: value }))
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
                setInputs((c) => ({ ...c, activityLevel: value }))
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
                setInputs((c) => ({ ...c, goal: value }))
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
      </CardContent>
    </Card>
  )
}
