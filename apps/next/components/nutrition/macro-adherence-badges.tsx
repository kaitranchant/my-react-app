import { cn } from '@/lib/utils'
import type { MacroAdherenceItem } from '@/lib/food-diary'

const STATUS_STYLES = {
  hit: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  close: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  miss: 'bg-red-500/15 text-red-700 dark:text-red-400',
  unknown: 'bg-muted text-muted-foreground',
} as const

type MacroAdherenceBadgesProps = {
  items: MacroAdherenceItem[]
  className?: string
}

export function MacroAdherenceBadges({
  items,
  className,
}: MacroAdherenceBadgesProps) {
  if (items.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {items.map((item) => (
        <span
          key={item.label}
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            STATUS_STYLES[item.status]
          )}
          title={
            item.consumed != null && item.target != null
              ? `${item.consumed} / ${item.target}`
              : undefined
          }
        >
          {item.label}
          {item.consumed != null && item.target != null
            ? ` ${Math.round(item.consumed)}/${Math.round(item.target)}`
            : ''}
        </span>
      ))}
    </div>
  )
}
