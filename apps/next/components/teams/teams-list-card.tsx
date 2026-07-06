import Link from 'next/link'
import { Flag } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  fetchTeamsForListPage,
  teamsListSuspenseKey,
  type TeamsListPageData,
} from '@/lib/teams-list-query'
import type { CoachGymTab } from '@/lib/clients-list-query'
import { ClientGymBadge } from '@/components/gym/client-gym-badge'
import { TeamRowActions } from '@/components/teams/team-row-actions'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FetchErrorState } from '@/components/ui/fetch-error-state'

type TeamsListCardProps = {
  searchParams: { q?: string; scope?: string }
  userId?: string
  coachGyms: CoachGymTab[]
}

function TeamsListContent({
  data,
  userId,
  coachGyms,
  q,
}: {
  data: TeamsListPageData
  userId?: string
  coachGyms: CoachGymTab[]
  q?: string
}) {
  const { teams, gymNamesById, coachNamesById } = data

  if (data.error) {
    return <FetchErrorState title="Couldn't load teams" />
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
        <div className="empty-state-icon">
          <Flag className="size-7" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">No teams found</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            {q
              ? 'Try adjusting your search.'
              : 'Create a team to assign the same program to multiple clients.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 p-4 md:hidden">
        {teams.map((team) => {
          const isOwnTeam = userId ? team.coach_id === userId : true
          const gymName = team.gym_id ? gymNamesById[team.gym_id] : null

          return (
            <Card key={team.id} className="py-0">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/teams/${team.id}`}
                      className="text-foreground hover:text-brand font-medium transition-colors"
                    >
                      {team.name}
                    </Link>
                    {team.description ? (
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {team.description}
                      </p>
                    ) : null}
                  </div>
                  <TeamRowActions
                    team={team}
                    isPrimaryCoach={isOwnTeam}
                    gyms={coachGyms}
                  />
                </div>
                {team.gym_id ? (
                  <ClientGymBadge
                    gymName={gymName}
                    primaryCoachName={
                      isOwnTeam ? null : coachNamesById[team.coach_id]
                    }
                    isOwnClient={isOwnTeam}
                  />
                ) : null}
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>
                    {team.member_count} member
                    {team.member_count === 1 ? '' : 's'}
                  </span>
                  <span>Program: {team.program?.name ?? '—'}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Table className="hidden md:table">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Name</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Program</TableHead>
            <TableHead className="w-12 pr-5" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => {
            const isOwnTeam = userId ? team.coach_id === userId : true
            const gymName = team.gym_id ? gymNamesById[team.gym_id] : null

            return (
              <TableRow key={team.id} className="group">
                <TableCell className="pl-5 font-medium">
                  <Link
                    href={`/teams/${team.id}`}
                    className="text-foreground hover:text-brand font-medium transition-colors"
                  >
                    {team.name}
                  </Link>
                  {team.description && (
                    <p className="text-muted-foreground mt-0.5 max-w-md truncate text-xs font-normal">
                      {team.description}
                    </p>
                  )}
                  {team.gym_id ? (
                    <div className="mt-1.5">
                      <ClientGymBadge
                        gymName={gymName}
                        primaryCoachName={
                          isOwnTeam ? null : coachNamesById[team.coach_id]
                        }
                        isOwnClient={isOwnTeam}
                      />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {team.member_count}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {team.program?.name ?? '—'}
                </TableCell>
                <TableCell className="pr-5">
                  <TeamRowActions
                    team={team}
                    isPrimaryCoach={isOwnTeam}
                    gyms={coachGyms}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

export async function TeamsListCard({
  searchParams,
  userId,
  coachGyms,
}: TeamsListCardProps) {
  const supabase = await createClient()
  const { q } = searchParams
  const data = await fetchTeamsForListPage(supabase, {
    userId,
    coachGyms,
    q,
    scopeParam: searchParams.scope,
  })

  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 px-5 py-4">
        <CardTitle className="text-muted-foreground">
          {data.teams.length} team{data.teams.length === 1 ? '' : 's'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <TeamsListContent
          data={data}
          userId={userId}
          coachGyms={coachGyms}
          q={q}
        />
      </CardContent>
    </Card>
  )
}

export { teamsListSuspenseKey }
