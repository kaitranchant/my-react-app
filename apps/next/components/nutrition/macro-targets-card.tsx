import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  computeMacroPercents,
  formatMacroValue,
  hasNutritionTargets,
  parseSupplements,
} from '@/lib/nutrition'
import type { ClientNutritionProfile } from 'app/types/database'
import { AlertTriangle, Pill, Target } from 'lucide-react'

type MacroTargetsCardProps = {
  profile: ClientNutritionProfile | null
  description?: string
}

export function MacroTargetsCard({
  profile,
  description = 'Daily macro targets set by your coach.',
}: MacroTargetsCardProps) {
  const percents = computeMacroPercents(profile)
  const supplements = parseSupplements(profile?.supplements)

  const targets = [
    {
      label: 'Calories',
      value: formatMacroValue(profile?.calories_kcal ?? null, 'kcal'),
      percent: null as number | null,
    },
    {
      label: 'Protein',
      value: formatMacroValue(profile?.protein_g ?? null, 'g'),
      percent: percents.protein,
    },
    {
      label: 'Carbs',
      value: formatMacroValue(profile?.carbs_g ?? null, 'g'),
      percent: percents.carbs,
    },
    {
      label: 'Fat',
      value: formatMacroValue(profile?.fat_g ?? null, 'g'),
      percent: percents.fat,
    },
    {
      label: 'Fiber',
      value: formatMacroValue(profile?.fiber_g ?? null, 'g'),
      percent: null,
    },
    {
      label: 'Water',
      value: formatMacroValue(profile?.water_ml ?? null, 'ml'),
      percent: null,
    },
  ].filter((entry) => entry.value != null)

  const restrictions = profile?.dietary_restrictions?.trim()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Macro targets</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasNutritionTargets(profile) ? (
          <EmptyState
            icon={Target}
            title="No macro targets yet"
            description="Your coach can set daily calorie and macro targets here."
            className="py-4"
          />
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {targets.map((target) => (
                <div
                  key={target.label}
                  className="border-border bg-muted/30 rounded-lg border px-4 py-3"
                >
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {target.label}
                    {target.percent != null ? ` (${target.percent}%)` : ''}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{target.value}</p>
                </div>
              ))}
            </div>
            {profile?.notes ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {profile.notes}
              </p>
            ) : null}
          </div>
        )}

        {restrictions || supplements.length > 0 ? (
          <div className="border-border mt-4 grid gap-3 border-t pt-4">
            {restrictions ? (
              <div className="flex gap-2 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium">Dietary restrictions</p>
                  <p className="text-muted-foreground">{restrictions}</p>
                </div>
              </div>
            ) : null}
            {supplements.length > 0 ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <Pill className="size-4" />
                  Supplements
                </p>
                <ul className="text-muted-foreground grid gap-1 text-sm">
                  {supplements.map((supplement, index) => (
                    <li key={`${supplement.name}-${index}`}>
                      {supplement.name}
                      {supplement.dosage ? ` · ${supplement.dosage}` : ''}
                      {supplement.timing ? ` · ${supplement.timing}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
