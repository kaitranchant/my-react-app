import { Badge } from '@/components/ui/badge'
import type { ProgramStatus } from 'app/types/database'

const labels: Record<ProgramStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
}

const variants: Record<
  ProgramStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'outline',
  active: 'default',
  archived: 'secondary',
}

export function ProgramStatusBadge({ status }: { status: ProgramStatus }) {
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
