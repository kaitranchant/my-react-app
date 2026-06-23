import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export function PortalStatCard({
  label,
  value,
  hint,
  accent,
  compact = false,
  valueTone = 'default',
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
  compact?: boolean
  valueTone?: 'default' | 'brand' | 'warning'
}) {
  return (
    <Card
      className={cn(
        'gap-0 py-0',
        accent && 'border-brand/15 from-brand/5 bg-gradient-to-br to-transparent'
      )}
    >
      <CardContent
        className={cn(
          'space-y-1',
          compact ? 'px-3 py-3' : 'px-4 py-4 sm:px-5 sm:py-5'
        )}
      >
        <p
          className={cn(
            'text-muted-foreground',
            compact ? 'text-[11px] leading-tight' : 'section-header'
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            'font-semibold tracking-tight tabular-nums',
            compact ? 'text-xl' : 'text-2xl sm:text-3xl',
            valueTone === 'brand' && 'text-brand',
            valueTone === 'warning' && 'text-status-warning',
            valueTone === 'default' && accent && 'text-brand'
          )}
        >
          {value}
        </p>
        <p className={cn(compact ? 'text-[11px] leading-tight' : 'helper-text')}>
          {hint}
        </p>
      </CardContent>
    </Card>
  )
}
