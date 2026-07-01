'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { DietaryRestrictionsPicker } from '@/components/nutrition/dietary-restrictions-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { nutritionSetupFormToFormValues } from '@/lib/nutrition'
import type { NutritionSetupFormValues } from '@/lib/validations/nutrition'
import type {
  ClientNutritionProfile,
  NutritionSupplement,
} from 'app/types/database'

type NutritionSetupFormProps = {
  profile: ClientNutritionProfile | null
  onSubmit: (values: NutritionSetupFormValues) => Promise<{ success: boolean; error?: string }>
  submitLabel?: string
  disabled?: boolean
}

export function NutritionSetupForm({
  profile,
  onSubmit,
  submitLabel = 'Submit setup form',
  disabled = false,
}: NutritionSetupFormProps) {
  const initialValues = React.useMemo(
    () => nutritionSetupFormToFormValues(profile),
    [profile]
  )
  const [values, setValues] = React.useState(initialValues)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  function updateField<K extends keyof NutritionSetupFormValues>(
    key: K,
    value: NutritionSetupFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateSupplement(
    index: number,
    field: keyof NutritionSupplement,
    value: string
  ) {
    setValues((current) => {
      const supplements = [...current.supplements]
      const existing = supplements[index] ?? {
        name: '',
        dosage: null,
        timing: null,
      }
      supplements[index] = {
        ...existing,
        [field]: value || null,
      }
      return { ...current, supplements }
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    const result = await onSubmit(values)
    setPending(false)
    return result
  }

  const isDisabled = disabled || pending

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="nutrition-setup-favorite-foods">Favorite foods</Label>
        <Textarea
          id="nutrition-setup-favorite-foods"
          rows={3}
          placeholder="Foods and meals you enjoy — e.g. chicken, rice bowls, Greek yogurt, berries…"
          value={values.favoriteFoods ?? ''}
          onChange={(event) =>
            updateField('favoriteFoods', event.target.value || null)
          }
          disabled={isDisabled}
        />
      </div>

      <div className="grid gap-3">
        <div>
          <Label>Current daily intake</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Your best estimate of what you eat now — not your coach&apos;s
            targets.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-calories">Calories (kcal)</Label>
            <Input
              id="nutrition-setup-calories"
              type="number"
              min="0"
              step="1"
              placeholder="Optional"
              value={values.currentCaloriesKcal ?? ''}
              onChange={(event) =>
                updateField(
                  'currentCaloriesKcal',
                  event.target.value === ''
                    ? null
                    : Number(event.target.value)
                )
              }
              disabled={isDisabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-protein">Protein (g)</Label>
            <Input
              id="nutrition-setup-protein"
              type="number"
              min="0"
              step="0.1"
              placeholder="Optional"
              value={values.currentProteinG ?? ''}
              onChange={(event) =>
                updateField(
                  'currentProteinG',
                  event.target.value === ''
                    ? null
                    : Number(event.target.value)
                )
              }
              disabled={isDisabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-carbs">Carbs (g)</Label>
            <Input
              id="nutrition-setup-carbs"
              type="number"
              min="0"
              step="0.1"
              placeholder="Optional"
              value={values.currentCarbsG ?? ''}
              onChange={(event) =>
                updateField(
                  'currentCarbsG',
                  event.target.value === ''
                    ? null
                    : Number(event.target.value)
                )
              }
              disabled={isDisabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-fat">Fat (g)</Label>
            <Input
              id="nutrition-setup-fat"
              type="number"
              min="0"
              step="0.1"
              placeholder="Optional"
              value={values.currentFatG ?? ''}
              onChange={(event) =>
                updateField(
                  'currentFatG',
                  event.target.value === ''
                    ? null
                    : Number(event.target.value)
                )
              }
              disabled={isDisabled}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Allergies & dietary restrictions</Label>
        <DietaryRestrictionsPicker
          value={values.dietaryRestrictions}
          onChange={(value) => updateField('dietaryRestrictions', value)}
          disabled={isDisabled}
        />
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <Label>Supplements (optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateField('supplements', [
                ...values.supplements,
                { name: '', dosage: null, timing: null },
              ])
            }
            disabled={isDisabled}
          >
            <Plus className="size-4" />
            Add supplement
          </Button>
        </div>
        {values.supplements.length > 0 ? (
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
                    onChange={(event) =>
                      updateSupplement(index, 'name', event.target.value)
                    }
                    disabled={isDisabled}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Dosage</Label>
                  <Input
                    placeholder="5g"
                    value={supplement.dosage ?? ''}
                    onChange={(event) =>
                      updateSupplement(index, 'dosage', event.target.value)
                    }
                    disabled={isDisabled}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Timing</Label>
                  <Input
                    placeholder="Post-workout"
                    value={supplement.timing ?? ''}
                    onChange={(event) =>
                      updateSupplement(index, 'timing', event.target.value)
                    }
                    disabled={isDisabled}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove supplement ${supplement.name || 'entry'}`}
                  onClick={() =>
                    updateField(
                      'supplements',
                      values.supplements.filter(
                        (_, itemIndex) => itemIndex !== index
                      )
                    )
                  }
                  disabled={isDisabled}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="nutrition-setup-additional-notes">
          Anything else your coach should know
        </Label>
        <Textarea
          id="nutrition-setup-additional-notes"
          rows={3}
          placeholder="Schedule, cooking habits, foods you dislike, travel, medical notes…"
          value={values.additionalNotes ?? ''}
          onChange={(event) =>
            updateField('additionalNotes', event.target.value || null)
          }
          disabled={isDisabled}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isDisabled}>
          {pending ? 'Submitting…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
