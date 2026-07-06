import type { AttendanceScope } from '@/lib/attendance'
import { attendanceScopeToParams } from '@/lib/attendance'
import type {
  LeaderboardFormula,
  LeaderboardMetric,
  LeaderboardPeriod,
} from '@/lib/validations/leaderboard'
import { metricSupportsExercise } from '@/lib/validations/leaderboard'

export function leaderboardScopeSuspenseKey(params: {
  scope?: string
  team?: string
}) {
  return [params.scope ?? 'all', params.team ?? ''].join('|')
}

export function leaderboardResultsSuspenseKey(params: {
  metric?: string
  period?: string
  exercise?: string
  formula?: string
  class?: string
}) {
  return [
    params.metric ?? 'strength',
    params.period ?? '',
    params.exercise ?? '',
    params.formula ?? '',
    params.class ?? '',
  ].join('|')
}

export function buildLeaderboardHref(
  pathname: string,
  searchParams: URLSearchParams,
  updates: {
    scope?: AttendanceScope
    metric?: LeaderboardMetric
    period?: LeaderboardPeriod | 'default'
    exercise?: string | null
    formula?: LeaderboardFormula | 'default'
    class?: string | null
  }
) {
  const params = new URLSearchParams(searchParams.toString())

  if (updates.scope) {
    const { scope: scopeParam, team: teamParam } = attendanceScopeToParams(
      updates.scope
    )
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
  }

  if (updates.metric !== undefined) {
    if (updates.metric === 'strength') {
      params.delete('metric')
    } else {
      params.set('metric', updates.metric)
    }

    if (!metricSupportsExercise(updates.metric)) {
      params.delete('exercise')
    }
    if (updates.metric !== 'relative_strength') {
      params.delete('formula')
    }
  }

  if (updates.period !== undefined) {
    if (updates.period === 'default') {
      params.delete('period')
    } else {
      params.set('period', updates.period)
    }
  }

  if (updates.exercise !== undefined) {
    if (updates.exercise === null) {
      params.delete('exercise')
    } else {
      params.set('exercise', updates.exercise)
    }
  }

  if (updates.formula !== undefined) {
    if (updates.formula === 'default') {
      params.delete('formula')
    } else {
      params.set('formula', updates.formula)
    }
  }

  if (updates.class !== undefined) {
    if (updates.class === null) {
      params.delete('class')
    } else {
      params.set('class', updates.class)
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildLeaderboardMetricHref(
  pathname: string,
  searchParams: URLSearchParams,
  metric: LeaderboardMetric
) {
  return buildLeaderboardHref(pathname, searchParams, { metric })
}

export function buildLeaderboardPeriodHref(
  pathname: string,
  searchParams: URLSearchParams,
  period: LeaderboardPeriod
) {
  return buildLeaderboardHref(pathname, searchParams, {
    period: period === 'month' ? 'default' : period,
  })
}

export function buildLeaderboardFormulaHref(
  pathname: string,
  searchParams: URLSearchParams,
  formula: LeaderboardFormula
) {
  return buildLeaderboardHref(pathname, searchParams, {
    formula: formula === 'dots' ? 'default' : formula,
  })
}

export function buildLeaderboardWeightClassHref(
  pathname: string,
  searchParams: URLSearchParams,
  weightClass: string
) {
  return buildLeaderboardHref(pathname, searchParams, {
    class: weightClass === 'all' ? null : weightClass,
  })
}

export function buildLeaderboardExerciseHref(
  pathname: string,
  searchParams: URLSearchParams,
  exerciseId: string,
  metric: LeaderboardMetric
) {
  if (metric === 'relative_strength' && exerciseId === 'total') {
    return buildLeaderboardHref(pathname, searchParams, { exercise: null })
  }
  return buildLeaderboardHref(pathname, searchParams, { exercise: exerciseId })
}
