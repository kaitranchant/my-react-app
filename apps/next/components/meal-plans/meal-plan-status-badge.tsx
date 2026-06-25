import { Badge } from '@/components/ui/badge'
import type { MealPlanStatus } from 'app/types/database'

const STATUS_VARIANT: Record<
  MealPlanStatus,
  'default' | 'secondary' | 'outline'
> = {
  active: 'default',
  draft: 'secondary',
  archived: 'outline',
}

export function MealPlanStatusBadge({ status }: { status: MealPlanStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
