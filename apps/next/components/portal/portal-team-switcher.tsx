'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import type { ClientTeamSummary } from '@/lib/portal-teams'
import { cn } from '@/lib/utils'

type PortalTeamSwitcherProps = {
  teams: ClientTeamSummary[]
  activeTeamId: string
}

export function PortalTeamSwitcher({
  teams,
  activeTeamId,
}: PortalTeamSwitcherProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (teams.length <= 1) return null

  return (
    <div className="flex flex-wrap gap-2">
      {teams.map((team) => {
        const isActive = team.id === activeTeamId
        const params = new URLSearchParams(searchParams.toString())
        params.set('team', team.id)
        const href = `${pathname}?${params.toString()}`

        return (
          <Link
            key={team.id}
            href={href}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-brand/40 bg-brand/10 text-brand'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {team.name}
          </Link>
        )
      })}
    </div>
  )
}
