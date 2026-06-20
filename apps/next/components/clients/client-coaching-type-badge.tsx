import { Badge } from '@/components/ui/badge'
import type { ClientCoachingType } from 'app/types/database'

const labels: Record<ClientCoachingType, string> = {
  online: 'Online',
  in_person: 'In-person',
  hybrid: 'Hybrid',
}

export function ClientCoachingTypeBadge({
  coachingType,
}: {
  coachingType: ClientCoachingType
}) {
  return <Badge variant="secondary">{labels[coachingType]}</Badge>
}
