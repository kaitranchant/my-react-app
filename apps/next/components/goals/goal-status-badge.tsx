import { Badge } from '@/components/ui/badge'
import { getGoalStatusLabel, type GoalProgressStatus } from '@/lib/goal-progress'

type GoalStatusBadgeProps = {
  status: GoalProgressStatus
  className?: string
}

export function GoalStatusBadge({ status, className }: GoalStatusBadgeProps) {
  const label = getGoalStatusLabel(status)

  let variant: 'success' | 'destructive' | 'warning' | 'secondary' | 'default' =
    'secondary'

  if (status === 'on_track' || status === 'complete') {
    variant = 'success'
  } else if (status === 'ahead') {
    variant = 'default'
  } else if (status === 'off_track' || status === 'behind') {
    variant = 'destructive'
  } else if (status === 'no_change') {
    variant = 'warning'
  }

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
