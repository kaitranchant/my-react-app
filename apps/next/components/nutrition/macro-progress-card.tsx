'use client'

import { MacroAdherenceBadges } from '@/components/nutrition/macro-adherence-badges'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatDayHeader } from '@/lib/calendar'
import {
  buildMacroAdherenceItems,
  sumFoodDiaryMacros,
} from '@/lib/food-diary'
import { hasNutritionTargets } from '@/lib/nutrition'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionLog,
  ClientNutritionProfile,
} from 'app/types/database'

type MacroProgressCardProps = {
  profile: ClientNutritionProfile | null
  foodDiaryEntries: ClientFoodDiaryEntry[]
  logDate: string
  todayKey?: string
  nutritionLog?: ClientNutritionLog | null
  waterMl?: number | null
  fiberG?: number | null
}

export function MacroProgressCard({
  profile,
  foodDiaryEntries,
  logDate,
  todayKey,
  nutritionLog = null,
  waterMl,
  fiberG,
}: MacroProgressCardProps) {
  const dayEntries = foodDiaryEntries.filter((entry) => entry.log_date === logDate)
  const consumed = sumFoodDiaryMacros(dayEntries)
  const macroItems = buildMacroAdherenceItems(
    consumed,
    profile,
    waterMl ?? nutritionLog?.water_ml,
    fiberG ?? nutritionLog?.fiber_g
  )

  const hasFoodLogged =
    consumed.caloriesKcal > 0 ||
    consumed.proteinG > 0 ||
    consumed.carbsG > 0 ||
    consumed.fatG > 0

  if (!hasNutritionTargets(profile) && !hasFoodLogged) {
    return null
  }

  const dateLabel =
    todayKey && logDate === todayKey
      ? 'today'
      : formatDayHeader(logDate).toLowerCase()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Macro progress</CardTitle>
        <CardDescription>
          {hasNutritionTargets(profile)
            ? `Food diary vs coach targets for ${dateLabel}.`
            : `Food logged for ${dateLabel} — set macro targets to track progress.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {macroItems.length > 0 ? (
          <MacroAdherenceBadges items={macroItems} />
        ) : hasFoodLogged ? (
          <p className="text-muted-foreground text-sm tabular-nums">
            {consumed.caloriesKcal > 0
              ? `${Math.round(consumed.caloriesKcal)} kcal`
              : null}
            {consumed.proteinG > 0
              ? ` · ${Math.round(consumed.proteinG)}g protein`
              : null}
            {consumed.carbsG > 0
              ? ` · ${Math.round(consumed.carbsG)}g carbs`
              : null}
            {consumed.fatG > 0 ? ` · ${Math.round(consumed.fatG)}g fat` : null}
            {consumed.fiberG > 0
              ? ` · ${Math.round(consumed.fiberG)}g fiber`
              : null}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            No food logged for this day yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
