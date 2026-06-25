'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { TdeeCalculatorCard } from '@/components/nutrition/tdee-calculator-card'
import { NutritionGoalContextBanner } from '@/components/nutrition/nutrition-goal-context-banner'
import { buildNutritionGoalContext } from '@/lib/nutrition-goal-context'
import { computeMacroPercents, nutritionProfileToFormValues } from '@/lib/nutrition'
import type { NutritionProfileFormValues } from '@/lib/validations/nutrition'
import type {
  BiologicalSex,
  ClientGoal,
  ClientInbodyScan,
  ClientNutritionProfile,
  NutritionSupplement,
} from 'app/types/database'

type NutritionProfileFormProps = {
  clientId: string
  profile: ClientNutritionProfile | null
  goals?: ClientGoal[]
  latestScan?: ClientInbodyScan | null
  biologicalSex?: BiologicalSex | null
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
  const [values, setValues] = React.useState<NutritionProfileFormValues>(
    nutritionProfileToFormValues(profile)
  )

  React.useEffect(() => {
    setValues(nutritionProfileToFormValues(profile))
  }, [profile])

  const goalContext = buildNutritionGoalContext(goals, latestScan)
  const macroPercents = computeMacroPercents({
    calories_kcal: values.caloriesKcal,
    protein_g: values.proteinG,
    carbs_g: values.carbsG,
    fat_g: values.fatG,
  } as ClientNutritionProfile)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = await updateClientNutritionProfile(clientId, values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Nutrition targets saved.')
    router.refresh()
  }

  function updateNumberField(
    field: keyof Pick<
      NutritionProfileFormValues,
      'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG' | 'waterMl'
    >,
    rawValue: string
  ) {
    setValues((current) => ({
      ...current,
      [field]: rawValue === '' ? null : Number(rawValue),
    }))
  }

  function updateSupplement(
    index: number,
    field: keyof NutritionSupplement,
    value: string
  ) {
    setValues((current) => {
      const supplements = [...current.supplements]
      const existing = supplements[index] ?? { name: '', dosage: null, timing: null }
      supplements[index] = {
        ...existing,
        [field]: value || null,
      }
      return { ...current, supplements }
    })
  }

  function addSupplement() {
    setValues((current) => ({
      ...current,
      supplements: [
        ...current.supplements,
        { name: '', dosage: null, timing: null },
      ],
    }))
  }

  function removeSupplement(index: number) {
    setValues((current) => ({
      ...current,
      supplements: current.supplements.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="grid gap-4">
      {goalContext ? <NutritionGoalContextBanner context={goalContext} /> : null}

      <TdeeCalculatorCard
        defaultWeightLbs={latestScan?.weight_lbs}
        defaultSex={biologicalSex}
        defaultBmr={latestScan?.basal_metabolic_rate_kcal}
        onApply={(suggested) =>
          setValues((current) => ({
            ...current,
            caloriesKcal: suggested.caloriesKcal,
            proteinG: suggested.proteinG,
            carbsG: suggested.carbsG,
            fatG: suggested.fatG,
          }))
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Macro targets</CardTitle>
          <CardDescription>
            Set daily calorie, macro, fiber, and water targets for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="nutrition-calories">Calories (kcal)</Label>
                <Input
                  id="nutrition-calories"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={values.caloriesKcal ?? ''}
                  onChange={(event) =>
                    updateNumberField('caloriesKcal', event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nutrition-protein">
                  Protein (g)
                  {macroPercents.protein != null
                    ? ` — ${macroPercents.protein}%`
                    : ''}
                </Label>
                <Input
                  id="nutrition-protein"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={values.proteinG ?? ''}
                  onChange={(event) =>
                    updateNumberField('proteinG', event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nutrition-carbs">
                  Carbs (g)
                  {macroPercents.carbs != null ? ` — ${macroPercents.carbs}%` : ''}
                </Label>
                <Input
                  id="nutrition-carbs"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={values.carbsG ?? ''}
                  onChange={(event) =>
                    updateNumberField('carbsG', event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nutrition-fat">
                  Fat (g)
                  {macroPercents.fat != null ? ` — ${macroPercents.fat}%` : ''}
                </Label>
                <Input
                  id="nutrition-fat"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={values.fatG ?? ''}
                  onChange={(event) =>
                    updateNumberField('fatG', event.target.value)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nutrition-fiber">Fiber (g)</Label>
                <Input
                  id="nutrition-fiber"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={values.fiberG ?? ''}
                  onChange={(event) =>
                    updateNumberField('fiberG', event.target.value)
                  }
                />
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
                  onChange={(event) =>
                    updateNumberField('waterMl', event.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nutrition-restrictions">
                Dietary restrictions & allergies
              </Label>
              <Textarea
                id="nutrition-restrictions"
                rows={2}
                placeholder="e.g. Gluten-free, lactose intolerant, nut allergy, vegan"
                value={values.dietaryRestrictions ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    dietaryRestrictions: event.target.value || null,
                  }))
                }
              />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Supplements</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSupplement}
                >
                  <Plus className="size-4" />
                  Add supplement
                </Button>
              </div>
              {values.supplements.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No supplements recorded.
                </p>
              ) : (
                <div className="grid gap-2">
                  {values.supplements.map((supplement, index) => (
                    <div
                      key={index}
                      className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                    >
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Name</Label>
                        <Input
                          placeholder="Creatine"
                          value={supplement.name}
                          onChange={(e) =>
                            updateSupplement(index, 'name', e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Dosage</Label>
                        <Input
                          placeholder="5g"
                          value={supplement.dosage ?? ''}
                          onChange={(e) =>
                            updateSupplement(index, 'dosage', e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Timing</Label>
                        <Input
                          placeholder="Post-workout"
                          value={supplement.timing ?? ''}
                          onChange={(e) =>
                            updateSupplement(index, 'timing', e.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSupplement(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="nutrition-notes">Coach notes</Label>
              <Textarea
                id="nutrition-notes"
                rows={3}
                placeholder="Guidance shown to the client (optional)"
                value={values.notes ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    notes: event.target.value || null,
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Save targets'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
