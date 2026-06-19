import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import type { ClientTeamMembership } from 'app/types/database'

export function ClientTeamBadges({
  memberships,
}: {
  memberships: ClientTeamMembership[]
}) {
  if (memberships.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {memberships.map(({ team }) => (
        <Badge key={team.id} variant="secondary" asChild>
          <Link href={`/teams/${team.id}`}>{team.name}</Link>
        </Badge>
      ))}
    </div>
  )
}
