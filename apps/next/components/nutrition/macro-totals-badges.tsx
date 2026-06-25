import { formatMacroValue } from '@/lib/nutrition'
import type { MealPlanDayMacros } from '@/lib/meal-plan-stats'
import { cn } from '@/lib/utils'

type MacroTotalsBadgesProps = {
  totals: MealPlanDayMacros
  className?: string
  label?: string
}

export function MacroTotalsBadges({
  totals,
  className,
  label,
}: MacroTotalsBadgesProps) {
  const items = [
    { key: 'calories', value: formatMacroValue(totals.caloriesKcal, 'kcal') },
    { key: 'protein', value: formatMacroValue(totals.proteinG, 'g P') },
    { key: 'fat', value: formatMacroValue(totals.fatG, 'g F') },
    { key: 'carbs', value: formatMacroValue(totals.carbsG, 'g C') },
  ].filter((item) => item.value != null)

  if (items.length === 0) return null

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label ? (
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.key}
            className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium"
          >
            {item.value}
          </span>
        ))}
      </div>
    </div>
  )
}
