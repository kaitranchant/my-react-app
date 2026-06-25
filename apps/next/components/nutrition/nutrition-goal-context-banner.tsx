import { Target } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { NutritionGoalContext } from '@/lib/nutrition-goal-context'

type NutritionGoalContextBannerProps = {
  context: NutritionGoalContext
  onApplyCalorieAdjustment?: () => void
}

export function NutritionGoalContextBanner({
  context,
  onApplyCalorieAdjustment,
}: NutritionGoalContextBannerProps) {
  return (
    <div className="border-primary/20 bg-primary/5 flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Target className="text-primary mt-0.5 size-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{context.headline}</p>
          {context.detail ? (
            <p className="text-muted-foreground mt-0.5 text-sm">{context.detail}</p>
          ) : null}
        </div>
      </div>
      {onApplyCalorieAdjustment && context.suggestedCalorieAdjustment != null ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={onApplyCalorieAdjustment}
        >
          Apply {context.suggestedCalorieAdjustment > 0 ? '+' : ''}
          {context.suggestedCalorieAdjustment} kcal
        </Button>
      ) : null}
    </div>
  )
}
