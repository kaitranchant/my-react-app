'use client'

import { Pill } from 'lucide-react'

import { DietaryRestrictionsDisplay } from '@/components/nutrition/dietary-restrictions-picker'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { parseSupplements } from '@/lib/nutrition'
import {
  ACTIVITY_LEVEL_LABELS,
  NUTRITION_SETUP_BIOLOGICAL_SEX_LABELS,
  NUTRITION_SETUP_GOAL_LABELS,
} from '@/lib/nutrition-setup-options'
import type { ClientNutritionProfile } from 'app/types/database'

type NutritionSetupIntakeSummaryProps = {
  profile: ClientNutritionProfile | null
}

function formatMacro(value: number | null, suffix: string): string | null {
  if (value == null) {
    return null
  }

  return `${value}${suffix}`
}

function SummaryField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value?.trim()) {
    return null
  }

  return (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

export function NutritionSetupIntakeSummary({
  profile,
}: NutritionSetupIntakeSummaryProps) {
  if (!profile) {
    return null
  }

  const supplements = parseSupplements(profile.supplements)
  const currentMacros = [
    formatMacro(profile.current_calories_kcal, ' kcal'),
    formatMacro(profile.current_protein_g, 'g protein'),
    formatMacro(profile.current_carbs_g, 'g carbs'),
    formatMacro(profile.current_fat_g, 'g fat'),
  ].filter(Boolean)

  const biometrics = [
    profile.body_weight_lbs != null
      ? `${profile.body_weight_lbs} lbs`
      : null,
    profile.height_in != null ? `${profile.height_in} in` : null,
    profile.age_years != null ? `${profile.age_years} years` : null,
    profile.setup_biological_sex
      ? NUTRITION_SETUP_BIOLOGICAL_SEX_LABELS[profile.setup_biological_sex]
      : null,
    profile.activity_level
      ? ACTIVITY_LEVEL_LABELS[profile.activity_level]
      : null,
  ].filter(Boolean)

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Client intake responses
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        {profile.setup_goal ? (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Goal
            </p>
            <p>{NUTRITION_SETUP_GOAL_LABELS[profile.setup_goal]}</p>
          </div>
        ) : null}

        {biometrics.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Biometrics & activity
            </p>
            <p>{biometrics.join(' · ')}</p>
          </div>
        ) : null}

        <SummaryField label="Favorite foods" value={profile.favorite_foods} />
        <SummaryField label="Food dislikes" value={profile.food_dislikes} />

        {currentMacros.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Current daily intake
            </p>
            <p>{currentMacros.join(' · ')}</p>
          </div>
        ) : null}

        {profile.dietary_restrictions ? (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Allergies & restrictions
            </p>
            <DietaryRestrictionsDisplay value={profile.dietary_restrictions} />
          </div>
        ) : null}

        <SummaryField
          label="Meal frequency / eating window"
          value={profile.meal_frequency}
        />
        <SummaryField
          label="Cooking time & skill"
          value={profile.cooking_time_skill}
        />
        <SummaryField
          label="Budget constraints"
          value={profile.budget_constraints}
        />
        <SummaryField label="Grocery access" value={profile.grocery_access} />

        {supplements.length > 0 ? (
          <div>
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
              <Pill className="size-3.5" />
              Supplements
            </p>
            <ul className="grid gap-2">
              {supplements.map((supplement, index) => (
                <li
                  key={`${supplement.name}-${index}`}
                  className="bg-muted/30 rounded-md border px-3 py-2"
                >
                  <span className="font-medium">{supplement.name}</span>
                  {supplement.dosage ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {supplement.dosage}
                    </span>
                  ) : null}
                  {supplement.timing ? (
                    <span className="text-muted-foreground">
                      {' '}
                      · {supplement.timing}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <SummaryField
          label="Additional notes"
          value={profile.client_nutrition_notes}
        />
      </CardContent>
    </Card>
  )
}
