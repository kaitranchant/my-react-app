import { Target } from 'lucide-react'

import type { NutritionGoalContext } from '@/lib/nutrition-goal-context'

type NutritionGoalContextBannerProps = {
  context: NutritionGoalContext
}

export function NutritionGoalContextBanner({
  context,
}: NutritionGoalContextBannerProps) {
  return (
    <div className="border-primary/20 bg-primary/5 flex gap-3 rounded-lg border px-4 py-3">
      <Target className="text-primary mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{context.headline}</p>
        {context.detail ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{context.detail}</p>
        ) : null}
      </div>
    </div>
  )
}
