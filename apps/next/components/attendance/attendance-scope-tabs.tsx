'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'
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

  const locationOptions = [
    { value: 'all', label: 'All' },
    { value: 'personal', label: 'Personal' },
    ...gyms.map((gym) => ({
      value: gym.id,
      label: gym.name,
      title: gym.name,
    })),
  ]

  const teamOptions = [
    { value: 'all-teams', label: 'All clients' },
    ...visibleTeams.map((team) => ({
      value: team.id,
      label: team.name,
      title: team.name,
    })),
  ]

  return (
    <div className="space-y-3">
      <FilterPills
        label="Filter by location"
        value={baseValue}
        onChange={handleBaseScopeChange}
        options={locationOptions}
      />

      {visibleTeams.length > 0 ? (
        <FilterPills
          label="Filter by team"
          value={selectedTeamId ?? 'all-teams'}
          onChange={handleTeamChange}
          size="sm"
          options={teamOptions}
        />
      ) : null}
    </div>
  )
}
