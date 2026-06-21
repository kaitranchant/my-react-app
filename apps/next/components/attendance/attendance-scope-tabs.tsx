'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  parseAttendanceScope,
  teamBelongsToBaseScope,
  teamsForAttendanceScope,
  type CoachTeam,
} from '@/lib/attendance'

type GymTab = {
  id: string
  name: string
}

function baseScopeValue(scope: ReturnType<typeof parseAttendanceScope>) {
  if (scope.kind === 'personal') {
    return 'personal'
  }
  if (scope.kind === 'gym') {
    return scope.gymId
  }
  return 'all'
}

export function AttendanceScopeTabs({
  gyms,
  teams,
}: {
  gyms: GymTab[]
  teams: CoachTeam[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const gymIds = gyms.map((gym) => gym.id)
  const scope = parseAttendanceScope(
    searchParams.get('scope') ?? undefined,
    searchParams.get('team') ?? undefined,
    new Set(gymIds),
    gyms,
    teams
  )
  const baseValue = baseScopeValue(scope)
  const visibleTeams = teamsForAttendanceScope(teams, scope)
  const selectedTeamId =
    scope.teamId && visibleTeams.some((team) => team.id === scope.teamId)
      ? scope.teamId
      : null

  function pushParams(params: URLSearchParams) {
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function handleBaseScopeChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all') {
      params.delete('scope')
    } else {
      params.set('scope', value)
    }

    const teamId = params.get('team')
    if (teamId) {
      const team = teams.find((entry) => entry.id === teamId)
      const nextBase =
        value === 'all'
          ? ({ kind: 'all' } as const)
          : value === 'personal'
            ? ({ kind: 'personal' } as const)
            : ({ kind: 'gym', gymId: value } as const)

      if (!team || !teamBelongsToBaseScope(team, nextBase)) {
        params.delete('team')
      }
    }

    pushParams(params)
  }

  function handleTeamChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (value === 'all-teams') {
      params.delete('team')
    } else {
      params.set('team', value)
    }

    pushParams(params)
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Filter by location
      </p>
      <Tabs value={baseValue} onValueChange={handleBaseScopeChange} className="min-w-0">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="inline-flex h-10 w-max gap-1">
            <TabsTrigger value="all" className="flex-none px-4">
              All
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex-none px-4">
              Personal
            </TabsTrigger>
            {gyms.map((gym) => (
              <TabsTrigger
                key={gym.id}
                value={gym.id}
                title={gym.name}
                className="flex-none px-4"
              >
                {gym.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {visibleTeams.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Filter by team
          </p>
          <Tabs
          value={selectedTeamId ?? 'all-teams'}
          onValueChange={handleTeamChange}
          className="min-w-0"
        >
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="inline-flex h-9 w-max gap-1 bg-muted/50">
              <TabsTrigger value="all-teams" className="flex-none px-3 text-sm">
                All clients
              </TabsTrigger>
              {visibleTeams.map((team) => (
                <TabsTrigger
                  key={team.id}
                  value={team.id}
                  title={team.name}
                  className="flex-none px-3 text-sm"
                >
                  {team.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
