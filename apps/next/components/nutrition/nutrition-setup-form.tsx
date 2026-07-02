'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { DietaryRestrictionsPicker } from '@/components/nutrition/dietary-restrictions-picker'
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
import { nutritionSetupFormToFormValues } from '@/lib/nutrition'
import {
  ACTIVITY_LEVEL_LABELS,
  NUTRITION_SETUP_BIOLOGICAL_SEX_LABELS,
  NUTRITION_SETUP_BIOLOGICAL_SEX_OPTIONS,
  NUTRITION_SETUP_GOAL_LABELS,
  NUTRITION_SETUP_GOAL_OPTIONS,
  NUTRITION_SETUP_ACTIVITY_LEVELS,
} from '@/lib/nutrition-setup-options'
import {
  nutritionSetupFormSchema,
  type NutritionSetupFormInputValues,
  type NutritionSetupFormValues,
} from '@/lib/validations/nutrition'
import type {
  BiologicalSex,
  ClientNutritionProfile,
  NutritionSupplement,
} from 'app/types/database'

type NutritionSetupFormProps = {
  profile: ClientNutritionProfile | null
  defaultBiologicalSex?: BiologicalSex | null
  onSubmit: (values: NutritionSetupFormValues) => Promise<{ success: boolean; error?: string }>
  submitLabel?: string
  disabled?: boolean
}

export function NutritionSetupForm({
  profile,
  defaultBiologicalSex = null,
  onSubmit,
  submitLabel = 'Submit setup form',
  disabled = false,
}: NutritionSetupFormProps) {
  const initialValues = React.useMemo(
    () => nutritionSetupFormToFormValues(profile, { defaultBiologicalSex }),
    [profile, defaultBiologicalSex]
  )
  const [values, setValues] = React.useState(initialValues)
  const [pending, setPending] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setValues(initialValues)
  }, [initialValues])

  function updateField<K extends keyof NutritionSetupFormInputValues>(
    key: K,
    value: NutritionSetupFormInputValues[K]
  ) {
    setFormError(null)
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateSupplement(
    index: number,
    field: keyof NutritionSupplement,
    value: string
  ) {
    setValues((current) => {
      const supplements = [...(current.supplements ?? [])]
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
    setFormError(null)

    const parsed = nutritionSetupFormSchema.safeParse(values)
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? 'Please check the form and try again.'
      setFormError(message)
      return { success: false, error: message }
    }

    setPending(true)
    const result = await onSubmit(parsed.data)
    setPending(false)
    if (!result.success) {
      setFormError(result.error ?? 'Something went wrong. Please try again.')
    }
    return result
  }

  const isDisabled = disabled || pending

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="nutrition-setup-goal">
          Goal <span className="text-destructive">*</span>
        </Label>
        <Select
          value={values.setupGoal ?? ''}
          onValueChange={(value) =>
            updateField('setupGoal', value as NutritionSetupFormInputValues['setupGoal'])
          }
          disabled={isDisabled}
        >
          <SelectTrigger id="nutrition-setup-goal" aria-required="true">
            <SelectValue placeholder="Select your goal" />
          </SelectTrigger>
          <SelectContent>
            {NUTRITION_SETUP_GOAL_OPTIONS.map((goal) => (
              <SelectItem key={goal} value={goal}>
                {NUTRITION_SETUP_GOAL_LABELS[goal]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        <div>
          <Label>About you</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Used to estimate calorie and macro needs. Weight and height are
            required for accurate calculations.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-weight">
              Weight (lbs) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nutrition-setup-weight"
              type="number"
              min="0"
              step="0.1"
              required
              aria-required="true"
              value={values.bodyWeightLbs ?? ''}
              onChange={(event) =>
                updateField(
                  'bodyWeightLbs',
                  event.target.value === ''
                    ? null
                    : Number(event.target.value)
                )
              }
              disabled={isDisabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-height">
              Height (in) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nutrition-setup-height"
              type="number"
              min="0"
              step="0.1"
              required
              aria-required="true"
              value={values.heightIn ?? ''}
              onChange={(event) =>
                updateField(
                  'heightIn',
                  event.target.value === ''
                    ? null
                    : Number(event.target.value)
                )
              }
              disabled={isDisabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-age">Age</Label>
            <Input
              id="nutrition-setup-age"
              type="number"
              min="14"
              max="100"
              step="1"
              value={values.ageYears ?? ''}
              onChange={(event) =>
                updateField(
                  'ageYears',
                  event.target.value === ''
                    ? null
                    : Number(event.target.value)
                )
              }
              disabled={isDisabled}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-sex">Sex</Label>
            <Select
              value={values.setupBiologicalSex ?? ''}
              onValueChange={(value) =>
                updateField(
                  'setupBiologicalSex',
                  (value || null) as NutritionSetupFormInputValues['setupBiologicalSex']
                )
              }
              disabled={isDisabled}
            >
              <SelectTrigger id="nutrition-setup-sex">
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                {NUTRITION_SETUP_BIOLOGICAL_SEX_OPTIONS.map((sex) => (
                  <SelectItem key={sex} value={sex}>
                    {NUTRITION_SETUP_BIOLOGICAL_SEX_LABELS[sex]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 grid gap-2">
            <Label htmlFor="nutrition-setup-activity">Activity level</Label>
            <Select
              value={values.activityLevel ?? ''}
              onValueChange={(value) =>
                updateField(
                  'activityLevel',
                  (value || null) as NutritionSetupFormInputValues['activityLevel']
                )
              }
              disabled={isDisabled}
            >
              <SelectTrigger id="nutrition-setup-activity">
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                {NUTRITION_SETUP_ACTIVITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {ACTIVITY_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="nutrition-setup-favorite-foods">Favorite foods</Label>
          <Textarea
            id="nutrition-setup-favorite-foods"
            rows={2}
            placeholder="Foods and meals you enjoy — e.g. chicken, rice bowls, Greek yogurt, berries…"
            value={values.favoriteFoods ?? ''}
            onChange={(event) =>
              updateField('favoriteFoods', event.target.value || null)
            }
            disabled={isDisabled}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nutrition-setup-food-dislikes">Food dislikes</Label>
          <Textarea
            id="nutrition-setup-food-dislikes"
            rows={2}
            placeholder="Foods you avoid or strongly dislike — separate from allergies"
            value={values.foodDislikes ?? ''}
            onChange={(event) =>
              updateField('foodDislikes', event.target.value || null)
            }
            disabled={isDisabled}
          />
        </div>
      </div>

      <div className="grid gap-3">
        <div>
          <Label>Current daily intake</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            Your best estimate of what you eat now — not your coach&apos;s
            targets. Leave blank if unsure.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="nutrition-setup-calories">Calories (kcal)</Label>
            <Input
              id="nutrition-setup-calories"
              type="number"
              min="0"
              step="1"
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
          value={values.dietaryRestrictions ?? null}
          onChange={(value) => updateField('dietaryRestrictions', value)}
          disabled={isDisabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="nutrition-setup-meal-frequency">
            Meal frequency / eating window
          </Label>
          <Textarea
            id="nutrition-setup-meal-frequency"
            rows={2}
            placeholder="e.g. 3 meals/day, intermittent fasting 16:8, skip breakfast…"
            value={values.mealFrequency ?? ''}
            onChange={(event) =>
              updateField('mealFrequency', event.target.value || null)
            }
            disabled={isDisabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nutrition-setup-cooking">
            Cooking time & skill
          </Label>
          <Textarea
            id="nutrition-setup-cooking"
            rows={2}
            placeholder="e.g. meal prep Sundays, 20 min weeknight meals, beginner cook…"
            value={values.cookingTimeSkill ?? ''}
            onChange={(event) =>
              updateField('cookingTimeSkill', event.target.value || null)
            }
            disabled={isDisabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nutrition-setup-budget">Budget constraints</Label>
          <Textarea
            id="nutrition-setup-budget"
            rows={2}
            placeholder="e.g. moderate budget, avoid premium items like steak and almonds…"
            value={values.budgetConstraints ?? ''}
            onChange={(event) =>
              updateField('budgetConstraints', event.target.value || null)
            }
            disabled={isDisabled}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nutrition-setup-grocery-access">Grocery access</Label>
          <Textarea
            id="nutrition-setup-grocery-access"
            rows={2}
            placeholder="e.g. limited store options, food desert, frequent travel…"
            value={values.groceryAccess ?? ''}
            onChange={(event) =>
              updateField('groceryAccess', event.target.value || null)
            }
            disabled={isDisabled}
          />
        </div>
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
                ...(values.supplements ?? []),
                { name: '', dosage: null, timing: null },
              ])
            }
            disabled={isDisabled}
          >
            <Plus className="size-4" />
            Add supplement
          </Button>
        </div>
        {(values.supplements ?? []).length > 0 ? (
          <div className="grid gap-2">
            {(values.supplements ?? []).map((supplement, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
              >
                <div className="col-span-2 grid gap-1.5 sm:col-span-1">
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
                  className="col-span-2 justify-self-end sm:col-span-1"
                  aria-label={`Remove supplement ${supplement.name || 'entry'}`}
                  onClick={() =>
                    updateField(
                      'supplements',
                      (values.supplements ?? []).filter(
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
          rows={2}
          placeholder="Schedule, travel, medical notes…"
          value={values.additionalNotes ?? ''}
          onChange={(event) =>
            updateField('additionalNotes', event.target.value || null)
          }
          disabled={isDisabled}
        />
      </div>

      {formError ? (
        <p className="text-destructive text-sm" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isDisabled}>
          {pending ? 'Submitting…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
