'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { buildAttendanceHref } from '@/lib/attendance-page-data'
import { FilterPillLinks, FilterPills } from '@/components/ui/filter-pills'
import {
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
  gymInvitedOnly = false,
}: {
  gyms: GymTab[]
  teams: CoachTeam[]
  scope?: AttendanceScope
  onScopeChange?: (scope: AttendanceScope) => void
  gymInvitedOnly?: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const gymIds = gyms.map((gym) => gym.id)
  const scopeFromUrl = parseAttendanceScope(
    searchParams.get('scope') ?? undefined,
    searchParams.get('team') ?? undefined,
    new Set(gymIds),
    gyms,
    teams,
    { gymInvitedOnly }
  )
  const scope = controlledScope ?? scopeFromUrl
  const baseValue = baseScopeValue(scope)
  const visibleTeams = teamsForAttendanceScope(teams, scope)
  const selectedTeamId =
    scope.teamId && visibleTeams.some((team) => team.id === scope.teamId)
      ? scope.teamId
      : null

  function buildScopeHref(nextScope: AttendanceScope) {
    if (onScopeChange) {
      return '#'
    }
    return buildAttendanceHref(pathname, searchParams, { scope: nextScope })
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

    onScopeChange?.(nextScope)
  }

  function handleTeamChange(value: string) {
    if (onScopeChange) {
      if (value === 'all-teams') {
        const { teamId: _teamId, ...baseScope } = scope
        onScopeChange(baseScope)
        return
      }

      const team = teams.find((entry) => entry.id === value)
      if (!team) return

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

      onScopeChange({ ...baseScope, teamId: value })
      return
    }
  }

  const locationOptions = useMemo(() => {
    const options = gymInvitedOnly
      ? gyms.map((gym) => ({
          value: gym.id,
          label: gym.name,
          title: gym.name,
        }))
      : [
          { value: 'all', label: 'All' },
          { value: 'personal', label: 'Personal' },
          ...gyms.map((gym) => ({
            value: gym.id,
            label: gym.name,
            title: gym.name,
          })),
        ]

    if (onScopeChange) {
      return options
    }

    return options.map((option) => {
      const nextBase =
        option.value === 'all'
          ? ({ kind: 'all' } as const)
          : option.value === 'personal'
            ? ({ kind: 'personal' } as const)
            : ({ kind: 'gym', gymId: option.value } as const)

      let nextScope: AttendanceScope = nextBase
      if (scope.teamId) {
        const team = teams.find((entry) => entry.id === scope.teamId)
        if (team && teamBelongsToBaseScope(team, nextBase)) {
          nextScope = { ...nextBase, teamId: scope.teamId }
        }
      }

      return {
        href: buildScopeHref(nextScope),
        label: option.label,
        active: baseValue === option.value,
      }
    })
  }, [baseValue, gymInvitedOnly, gyms, onScopeChange, scope.teamId, teams])

  const teamOptions = useMemo(() => {
    const options = [
      { value: 'all-teams', label: 'All clients' },
      ...visibleTeams.map((team) => ({
        value: team.id,
        label: team.name,
        title: team.name,
      })),
    ]

    if (onScopeChange) {
      return options
    }

    return options.map((option) => {
      if (option.value === 'all-teams') {
        const { teamId: _teamId, ...baseScope } = scope
        return {
          href: buildScopeHref(baseScope),
          label: option.label,
          active: selectedTeamId === null,
        }
      }

      const team = teams.find((entry) => entry.id === option.value)
      if (!team) {
        return {
          href: pathname,
          label: option.label,
          active: false,
        }
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

      return {
        href: buildScopeHref({ ...baseScope, teamId: option.value }),
        label: option.label,
        active: selectedTeamId === option.value,
      }
    })
  }, [onScopeChange, pathname, scope, selectedTeamId, teams, visibleTeams])

  return (
    <div className="space-y-3">
      {onScopeChange ? (
        <FilterPills
          label="Filter by location"
          value={baseValue}
          onChange={handleBaseScopeChange}
          options={locationOptions as { value: string; label: string }[]}
        />
      ) : (
        <FilterPillLinks
          label="Filter by location"
          options={locationOptions as { href: string; label: string; active: boolean }[]}
        />
      )}

      {visibleTeams.length > 0 ? (
        onScopeChange ? (
          <FilterPills
            label="Filter by team"
            value={selectedTeamId ?? 'all-teams'}
            onChange={handleTeamChange}
            size="sm"
            options={teamOptions as { value: string; label: string }[]}
          />
        ) : (
          <FilterPillLinks
            label="Filter by team"
            size="sm"
            options={teamOptions as { href: string; label: string; active: boolean }[]}
          />
        )
      ) : null}
    </div>
  )
}
