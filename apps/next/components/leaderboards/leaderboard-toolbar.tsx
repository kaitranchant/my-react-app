'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { buildLeaderboardExerciseHref } from '@/lib/leaderboard-page-data'
import { LeaderboardExerciseSelect } from '@/components/leaderboards/leaderboard-exercise-select'
import type { LeaderboardExerciseOption } from '@/lib/leaderboard-queries'
import {
  metricSupportsExercise,
  parseLeaderboardExerciseId,
  parseLeaderboardMetric,
} from '@/lib/validations/leaderboard'

const POWERLIFTING_TOTAL_VALUE = 'total'

type LeaderboardToolbarProps = {
  exercises: LeaderboardExerciseOption[]
  resolvedExerciseId: string | null
  resolvedExerciseName: string | null
}

export function LeaderboardToolbar({
  exercises,
  resolvedExerciseId,
  resolvedExerciseName,
}: LeaderboardToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)
  const exerciseParam = searchParams.get('exercise')
  const selectedExerciseId =
    metric === 'relative_strength'
      ? exerciseParam === POWERLIFTING_TOTAL_VALUE || !exerciseParam
        ? POWERLIFTING_TOTAL_VALUE
        : (parseLeaderboardExerciseId(exerciseParam) ?? POWERLIFTING_TOTAL_VALUE)
      : (parseLeaderboardExerciseId(exerciseParam ?? undefined) ??
        resolvedExerciseId ??
        '')

  const selectOptions = useMemo(() => {
    const items = exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
    }))

    if (metric === 'relative_strength') {
      return [
        { id: POWERLIFTING_TOTAL_VALUE, name: 'Powerlifting total (SBD)' },
        ...items,
      ]
    }

    return items
  }, [exercises, metric])

  if (!metricSupportsExercise(metric)) {
    return null
  }

  function handleExerciseChange(value: string) {
    const href = buildLeaderboardExerciseHref(
      pathname,
      searchParams,
      value,
      metric
    )
    router.replace(href, { scroll: false })
  }

  const rankingLabel =
    metric === 'relative_strength'
      ? resolvedExerciseName
        ? `Scoring ${resolvedExerciseName} relative to bodyweight.`
        : 'Scoring powerlifting total (squat + bench + deadlift) relative to bodyweight.'
      : resolvedExerciseName
        ? `Ranking by ${resolvedExerciseName}.`
        : 'Select an exercise to rank athletes.'

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">{rankingLabel}</p>
      <LeaderboardExerciseSelect
        options={selectOptions}
        value={selectedExerciseId || selectOptions[0]?.id || ''}
        onValueChange={handleExerciseChange}
      />
    </div>
  )
}
