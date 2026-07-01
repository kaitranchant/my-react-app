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

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Client intake responses
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        {profile.favorite_foods?.trim() ? (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Favorite foods
            </p>
            <p className="leading-relaxed whitespace-pre-wrap">
              {profile.favorite_foods}
            </p>
          </div>
        ) : null}

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

        {profile.client_nutrition_notes?.trim() ? (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Additional notes
            </p>
            <p className="leading-relaxed whitespace-pre-wrap">
              {profile.client_nutrition_notes}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
