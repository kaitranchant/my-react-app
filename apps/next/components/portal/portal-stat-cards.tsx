import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export function PortalStatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <Card
      className={cn(
        'gap-0 py-0',
        accent && 'border-brand/15 from-brand/5 bg-gradient-to-br to-transparent'
      )}
    >
      <CardContent className="space-y-1 px-4 py-4 sm:px-5 sm:py-5">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p
          className={cn(
            'text-2xl font-semibold tracking-tight sm:text-3xl',
            accent && 'text-brand'
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}
