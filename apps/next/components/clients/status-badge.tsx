import { Badge } from '@/components/ui/badge'
import type { ClientStatus } from 'app/types/database'

const config: Record<
  ClientStatus,
  { label: string; variant: 'success' | 'warning' | 'secondary' }
> = {
  active: { label: 'Active', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  archived: { label: 'Archived', variant: 'secondary' },
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}
