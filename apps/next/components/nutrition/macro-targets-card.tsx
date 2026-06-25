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
} from '@/lib/nutrition'
import type { ClientNutritionProfile } from 'app/types/database'
import { Target } from 'lucide-react'

type MacroTargetsCardProps = {
  profile: ClientNutritionProfile | null
  description?: string
}

export function MacroTargetsCard({
  profile,
  description = 'Daily macro targets set by your coach.',
}: MacroTargetsCardProps) {
  const percents = computeMacroPercents(profile)

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
              <div className="border-border border-t pt-4">
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                  Coach guidance
                </p>
                <p className="text-sm leading-relaxed">{profile.notes}</p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
