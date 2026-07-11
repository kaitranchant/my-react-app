'use client'

import type { NutritionTrendPoint } from '@/lib/nutrition-trends'
import { MacroAdherenceBadges } from '@/components/nutrition/macro-adherence-badges'
import { formatAdherenceScore } from '@/lib/nutrition'
import { cn } from '@/lib/utils'

type NutritionTrendsChartProps = {
  points: NutritionTrendPoint[]
  className?: string
}

export function NutritionTrendsChart({
  points,
  className,
}: NutritionTrendsChartProps) {
  if (points.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No adherence logs yet for this period.
      </p>
    )
  }

  return (
    <div className={cn('grid gap-3', className)}>
      {points.map((point) => {
        const score = point.adherenceScore
        const width =
          score != null
            ? `${(score / 5) * 100}%`
            : point.macroItems.length > 0
              ? '8%'
              : '0%'

        return (
          <div key={point.dateKey} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{point.label}</span>
              <span className="shrink-0 font-medium">
                {score != null
                  ? formatAdherenceScore(score)
                  : 'Food logged — no score'}
              </span>
            </div>
            {point.clientNotes ? (
              <p className="text-muted-foreground text-sm">{point.clientNotes}</p>
            ) : null}
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className={cn('h-full rounded-full transition-all', point.colorClass)}
                style={{ width }}
              />
            </div>
            {point.macroItems.length > 0 ? (
              <MacroAdherenceBadges items={point.macroItems} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
