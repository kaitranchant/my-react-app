'use client'

import type { NutritionTrendPoint } from '@/lib/nutrition-trends'
import { MacroAdherenceBadges } from '@/components/nutrition/macro-adherence-badges'
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
        const score = point.adherenceScore ?? 0
        const width = `${(score / 5) * 100}%`

        return (
          <div key={point.dateKey} className="grid gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{point.label}</span>
              <span className="font-medium">{score}/5</span>
            </div>
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
