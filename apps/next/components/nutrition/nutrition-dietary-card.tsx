import { AlertTriangle, Pill } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { hasDietaryInfo } from '@/lib/nutrition-goal-context'
import { parseSupplements } from '@/lib/nutrition'
import type { ClientNutritionProfile } from 'app/types/database'

type NutritionDietaryCardProps = {
  profile: ClientNutritionProfile | null
}

export function NutritionDietaryCard({ profile }: NutritionDietaryCardProps) {
  const restrictions = profile?.dietary_restrictions?.trim()
  const supplements = parseSupplements(profile?.supplements)

  if (!hasDietaryInfo(profile)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-4" />
            Dietary restrictions & supplements
          </CardTitle>
          <CardDescription>
            Record allergies, intolerances, and supplements so they&apos;re
            visible when planning meals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">None recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-500" />
          Dietary restrictions & supplements
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {restrictions ? (
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Restrictions & allergies
            </p>
            <p className="mt-1 text-sm leading-relaxed">{restrictions}</p>
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
                  className="bg-muted/30 rounded-md border px-3 py-2 text-sm"
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
      </CardContent>
    </Card>
  )
}
