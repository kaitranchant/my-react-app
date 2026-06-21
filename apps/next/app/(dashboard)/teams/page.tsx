import Link from 'next/link'
import { Suspense } from 'react'
import { Flag } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getGymsForCoach } from '@/lib/gym-access'
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
import { PageHeader } from '@/components/dashboard/page-header'
import { ClientsScopeTabs } from '@/components/clients/clients-scope-tabs'
import { ClientGymBadge } from '@/components/gym/client-gym-badge'
import { TeamsToolbar } from '@/components/teams/teams-toolbar'
import { TeamRowActions } from '@/components/teams/team-row-actions'
import type { Program, Team, TeamWithProgram } from 'app/types/database'

export const metadata = {
  title: 'Teams — Coaching App',
}

function resolveTeamScope(
  scopeParam: string | undefined,
  coachGymIds: Set<string>,
  coachGyms: { id: string }[]
) {
  const rawScope = scopeParam ?? 'all'
  if (rawScope === 'all' || rawScope === 'personal') {
    return rawScope
  }
  if (rawScope === 'gym' && coachGyms.length === 1) {
    return coachGyms[0].id
  }
  if (coachGymIds.has(rawScope)) {
    return rawScope
  }
  return 'all'
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>
}) {
  const { q, scope: scopeParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const scope = resolveTeamScope(scopeParam, coachGymIds, coachGyms)
  const gymNamesById = new Map(coachGyms.map((gym) => [gym.id, gym.name]))

  let queryBuilder = supabase.from('teams').select('*').order('name', {
    ascending: true,
  })

  if (user && scope === 'personal') {
    queryBuilder = queryBuilder.eq('coach_id', user.id).is('gym_id', null)
  } else if (user && coachGymIds.has(scope)) {
    queryBuilder = queryBuilder.eq('gym_id', scope)
  }

  if (q?.trim()) {
    const term = `%${q.trim()}%`
    queryBuilder = queryBuilder.or(`name.ilike.${term},description.ilike.${term}`)
  }

  const { data: teamsData, error } = await queryBuilder
  const teams = (teamsData ?? []) as Team[]

  const coachNamesById = new Map<string, string>()
  const otherCoachIds = Array.from(
    new Set(
      teams
        .filter((team) => user && team.coach_id !== user.id)
        .map((team) => team.coach_id)
    )
  )

  if (otherCoachIds.length > 0) {
    const { data: coachRows } = await supabase
      .from('profiles')
      .select('id, full_name, business_name')
      .in('id', otherCoachIds)

    for (const coach of coachRows ?? []) {
      coachNamesById.set(
        coach.id,
        coach.full_name ?? coach.business_name ?? 'Coach'
      )
    }
  }

  const missingGymIds = Array.from(
    new Set(
      teams
        .map((team) => team.gym_id)
        .filter(
          (gymId): gymId is string => gymId !== null && !gymNamesById.has(gymId)
        )
    )
  )

  if (missingGymIds.length > 0) {
    const { data: gymRows } = await supabase
      .from('gyms')
      .select('id, name')
      .in('id', missingGymIds)

    for (const gym of gymRows ?? []) {
      gymNamesById.set(gym.id, gym.name)
    }
  }

  const programIds = Array.from(
    new Set(
      teams
        .map((team) => team.active_program_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const programsById = new Map<string, Pick<Program, 'id' | 'name' | 'status'>>()
  if (programIds.length > 0) {
    const { data: programRows } = await supabase
      .from('programs')
      .select('id, name, status')
      .in('id', programIds)

    for (const program of programRows ?? []) {
      programsById.set(program.id, program as Pick<Program, 'id' | 'name' | 'status'>)
    }
  }

  const { data: memberRows } = await supabase
    .from('team_members')
    .select('team_id')

  const memberCounts = new Map<string, number>()
  for (const row of memberRows ?? []) {
    memberCounts.set(row.team_id, (memberCounts.get(row.team_id) ?? 0) + 1)
  }

  const teamsWithMeta: TeamWithProgram[] = teams.map((team) => ({
    ...team,
    program: team.active_program_id
      ? programsById.get(team.active_program_id) ?? null
      : null,
    member_count: memberCounts.get(team.id) ?? 0,
  }))

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Teams"
        description="Group clients who share the same workout program and calendar."
      />

      <TeamsToolbar gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))} />

      {coachGyms.length > 0 ? (
        <Suspense fallback={null}>
          <ClientsScopeTabs gyms={coachGyms} />
        </Suspense>
      ) : null}

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-sm font-medium">
            {teamsWithMeta.length} team{teamsWithMeta.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="text-destructive p-6 text-sm">
              Could not load teams: {error.message}
            </p>
          ) : teamsWithMeta.length === 0 ? (
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead className="w-12 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamsWithMeta.map((team) => {
                  const isOwnTeam = user ? team.coach_id === user.id : true
                  const gymName = team.gym_id
                    ? gymNamesById.get(team.gym_id)
                    : null

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
                                isOwnTeam
                                  ? null
                                  : coachNamesById.get(team.coach_id)
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
                          gyms={coachGyms.map((gym) => ({
                            id: gym.id,
                            name: gym.name,
                          }))}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
