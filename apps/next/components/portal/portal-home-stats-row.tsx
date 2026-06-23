import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type PortalHomeStatsRowProps = {
  streak: number
  completionRate: number | null
  lastActive: string
}

function formatLastActiveForStats(label: string): string {
  if (label === 'No activity yet') return '—'
  return label
}

function StatCell({
  label,
  value,
  subtitle,
  valueClassName,
}: {
  label: string
  value: string
  subtitle?: string
  valueClassName?: string
}) {
  return (
    <div className="flex min-w-0 flex-col items-center px-2 py-3.5 text-center sm:px-4 sm:py-4">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase sm:text-xs">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 max-w-full truncate text-sm leading-none font-semibold',
          valueClassName
        )}
      >
        {value}
      </p>
      {subtitle ? (
        <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-[11px]">
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

export function PortalHomeStatsRow({
  streak,
  completionRate,
  lastActive,
}: PortalHomeStatsRowProps) {
  const completionValue = completionRate !== null ? `${completionRate}%` : '—'
  const completionTone =
    completionRate !== null && completionRate < 50
      ? 'text-status-warning'
      : completionRate !== null && completionRate >= 80
        ? 'text-status-success'
        : undefined

  return (
    <Card className="gap-0 py-0">
      <CardContent className="grid grid-cols-3 divide-x p-0">
        <StatCell
          label="Streak"
          value={streak > 0 ? String(streak) : '—'}
          subtitle={streak > 0 ? 'days' : undefined}
        />
        <StatCell
          label="This week"
          value={completionValue}
          subtitle="completion"
          valueClassName={completionTone}
        />
        <StatCell
          label="Last active"
          value={formatLastActiveForStats(lastActive)}
        />
      </CardContent>
    </Card>
  )
}
