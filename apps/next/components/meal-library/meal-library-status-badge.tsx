import { Badge } from '@/components/ui/badge'
import type { ExerciseStatus } from 'app/types/database'

const labels: Record<ExerciseStatus, string> = {
  active: 'Active',
  archived: 'Archived',
}

const variants: Record<
  ExerciseStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  active: 'default',
  archived: 'secondary',
}

export function MealLibraryStatusBadge({ status }: { status: ExerciseStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
