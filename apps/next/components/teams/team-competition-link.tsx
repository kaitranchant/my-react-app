'use client'

import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { formatCompetitionMonthYear } from '@/lib/team-labels'

type TeamCompetitionLinkProps = {
  teamId: string
  name: string
  date: string
}

export function TeamCompetitionLink({
  teamId,
  name: _name,
  date,
}: TeamCompetitionLinkProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() =>
        router.replace(`/teams/${teamId}?tab=schedule&date=${date}`, {
          scroll: false,
        })
      }
      className="inline-flex"
    >
      <Badge
        variant="default"
        className="bg-brand/15 text-brand hover:bg-brand/25 border-brand/20 cursor-pointer gap-1.5 transition-colors"
      >
        <Trophy className="size-3.5" />
        Next meet: {formatCompetitionMonthYear(date)}
      </Badge>
    </button>
  )
}
