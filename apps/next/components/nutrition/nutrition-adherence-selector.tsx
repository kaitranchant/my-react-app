'use client'

import { CHECK_IN_SCALES, gradedScaleButtonClass } from '@/lib/check-ins'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type NutritionAdherenceSelectorProps = {
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

export function NutritionAdherenceSelector({
  value,
  onChange,
  disabled,
}: NutritionAdherenceSelectorProps) {
  const scale = CHECK_IN_SCALES.nutrition

  return (
    <div className="grid gap-2">
      <Label>Nutrition adherence</Label>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((level) => {
          const selected = value === level
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`Adherence ${level} of 5`}
              onClick={() => onChange(level)}
              className={cn(
                'flex min-h-11 items-center justify-center rounded-lg border text-center transition-colors disabled:opacity-50 sm:min-h-12',
                gradedScaleButtonClass(level, selected, scale.tone)
              )}
            >
              <span className="text-sm font-semibold">{level}</span>
            </button>
          )
        })}
      </div>
      <div className="text-muted-foreground flex justify-between px-0.5 text-[10px] leading-tight sm:text-xs">
        <span>{scale.labels[0]}</span>
        <span>{scale.labels[4]}</span>
      </div>
    </div>
  )
}
