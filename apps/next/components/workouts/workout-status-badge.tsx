import { Badge } from '@/components/ui/badge'
import type { WorkoutStatus } from 'app/types/database'

const labels: Record<WorkoutStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
}

const variants: Record<
  WorkoutStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'outline',
  active: 'default',
  archived: 'secondary',
}

export function WorkoutStatusBadge({ status }: { status: WorkoutStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
