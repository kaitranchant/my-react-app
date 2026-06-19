'use client'

import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatCompetitionDate } from '@/lib/team-labels'

type TeamCompetitionLinkProps = {
  teamId: string
  name: string
  date: string
}

export function TeamCompetitionLink({
  teamId,
  name,
  date,
}: TeamCompetitionLinkProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() =>
        router.push(`/teams/${teamId}?tab=schedule&date=${date}`, { scroll: false })
      }
      className="inline-flex"
    >
      <Badge
        variant="secondary"
        className="hover:bg-secondary/80 cursor-pointer gap-1 transition-colors"
      >
        <Trophy className="size-3.5" />
        {name} · {formatCompetitionDate(date)}
      </Badge>
    </button>
  )
}
