import { Badge } from '@/components/ui/badge'
import { getGoalStatusLabel, type GoalProgressStatus } from '@/lib/goal-progress'

type GoalStatusBadgeProps = {
  status: GoalProgressStatus
  className?: string
}

export function GoalStatusBadge({ status, className }: GoalStatusBadgeProps) {
  const label = getGoalStatusLabel(status)

  let variant:
    | 'success-soft'
    | 'warning-soft'
    | 'brand-soft'
    | 'secondary'
    | 'default' = 'secondary'

  if (status === 'on_track' || status === 'complete' || status === 'ahead') {
    variant = 'success-soft'
  } else if (status === 'behind') {
    variant = 'warning-soft'
  } else if (status === 'off_track') {
    variant = 'brand-soft'
  } else if (status === 'no_change') {
    variant = 'warning-soft'
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
