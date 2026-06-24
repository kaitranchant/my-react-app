import { Badge } from '@/components/ui/badge'
import { ClientCoachingTypeBadge } from '@/components/clients/client-coaching-type-badge'
import type { Client } from 'app/types/database'

export function ClientUserTypeBadge({
  client,
}: {
  client: Pick<Client, 'is_coach_self' | 'coaching_type'>
}) {
  if (client.is_coach_self) {
    return <Badge variant="secondary">Coach</Badge>
  }

  if (client.coaching_type) {
    return (
      <ClientCoachingTypeBadge coachingType={client.coaching_type} />
    )
  }

  return null
}
