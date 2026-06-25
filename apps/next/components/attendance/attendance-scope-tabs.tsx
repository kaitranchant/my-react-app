'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'
import {
  attendanceScopeToParams,
  parseAttendanceScope,
  teamBelongsToBaseScope,
  teamsForAttendanceScope,
  type AttendanceScope,
  type CoachTeam,
} from '@/lib/attendance'

type GymTab = {
  id: string
  name: string
}

function baseScopeValue(scope: AttendanceScope) {
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
  scope: controlledScope,
  onScopeChange,
}: {
  gyms: GymTab[]
  teams: CoachTeam[]
  scope?: AttendanceScope
  onScopeChange?: (scope: AttendanceScope) => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const gymIds = gyms.map((gym) => gym.id)
  const scopeFromUrl = parseAttendanceScope(
    searchParams.get('scope') ?? undefined,
    searchParams.get('team') ?? undefined,
    new Set(gymIds),
    gyms,
    teams
  )
  const scope = controlledScope ?? scopeFromUrl
  const baseValue = baseScopeValue(scope)
  const visibleTeams = teamsForAttendanceScope(teams, scope)
  const selectedTeamId =
    scope.teamId && visibleTeams.some((team) => team.id === scope.teamId)
      ? scope.teamId
      : null

  function applyScope(nextScope: AttendanceScope) {
    if (onScopeChange) {
      onScopeChange(nextScope)
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    const { scope: scopeParam, team: teamParam } =
      attendanceScopeToParams(nextScope)

    if (scopeParam) {
      params.set('scope', scopeParam)
    } else {
      params.delete('scope')
    }

    if (teamParam) {
      params.set('team', teamParam)
    } else {
      params.delete('team')
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function handleBaseScopeChange(value: string) {
    const nextBase =
      value === 'all'
        ? ({ kind: 'all' } as const)
        : value === 'personal'
          ? ({ kind: 'personal' } as const)
          : ({ kind: 'gym', gymId: value } as const)

    let nextScope: AttendanceScope = nextBase

    if (scope.teamId) {
      const team = teams.find((entry) => entry.id === scope.teamId)
      if (team && teamBelongsToBaseScope(team, nextBase)) {
        nextScope = { ...nextBase, teamId: scope.teamId }
      }
    }

    applyScope(nextScope)
  }

  function handleTeamChange(value: string) {
    if (value === 'all-teams') {
      const { teamId: _teamId, ...baseScope } = scope
      applyScope(baseScope)
      return
    }

    const team = teams.find((entry) => entry.id === value)
    if (!team) {
      return
    }

    let baseScope: AttendanceScope =
      scope.kind === 'gym'
        ? scope
        : scope.kind === 'personal'
          ? scope
          : { kind: 'all' }

    if (!teamBelongsToBaseScope(team, baseScope)) {
      baseScope = team.gym_id
        ? { kind: 'gym', gymId: team.gym_id }
        : { kind: 'personal' }
    }

    applyScope({ ...baseScope, teamId: value })
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
