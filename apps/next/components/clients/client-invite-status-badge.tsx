import { Badge } from '@/components/ui/badge'
import type { ClientInviteStatus } from 'app/types/database'

const config: Record<
  ClientInviteStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  not_invited: { label: 'No account', variant: 'outline' },
  pending: { label: 'Invite pending', variant: 'secondary' },
  accepted: { label: 'Account linked', variant: 'default' },
}

export function ClientInviteStatusBadge({
  status,
}: {
  status: ClientInviteStatus
}) {
  const { label, variant } = config[status] ?? config.not_invited
  return <Badge variant={variant}>{label}</Badge>
}
