import Link from 'next/link'
import { Flag } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
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
import { TeamsToolbar } from '@/components/teams/teams-toolbar'
import { TeamRowActions } from '@/components/teams/team-row-actions'
import type { Program, Team, TeamWithProgram } from 'app/types/database'

export const metadata = {
  title: 'Teams — Coaching App',
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true })

  if (q?.trim()) {
    const term = `%${q.trim()}%`
    queryBuilder = queryBuilder.or(`name.ilike.${term},description.ilike.${term}`)
  }

  const { data: teamsData, error } = await queryBuilder
  const teams = (teamsData ?? []) as Team[]

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

      <TeamsToolbar />

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
                {teamsWithMeta.map((team) => (
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
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.member_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.program?.name ?? '—'}
                    </TableCell>
                    <TableCell className="pr-5">
                      <TeamRowActions team={team} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
