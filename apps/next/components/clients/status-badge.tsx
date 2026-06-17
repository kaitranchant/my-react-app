import { Badge } from '@/components/ui/badge'
import type { ClientStatus } from 'app/types/database'

const config: Record<
  ClientStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  active: { label: 'Active', variant: 'default' },
  paused: { label: 'Paused', variant: 'secondary' },
  archived: { label: 'Archived', variant: 'outline' },
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}
