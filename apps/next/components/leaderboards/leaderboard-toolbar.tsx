'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
      : (parseLeaderboardExerciseId(exerciseParam ?? undefined) ?? resolvedExerciseId)

  if (!metricSupportsExercise(metric)) {
    return null
  }

  function handleExerciseChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (metric === 'relative_strength' && value === POWERLIFTING_TOTAL_VALUE) {
      params.delete('exercise')
    } else {
      params.set('exercise', value)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
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
      <Select
        value={selectedExerciseId ?? undefined}
        onValueChange={handleExerciseChange}
      >
        <SelectTrigger className="w-full sm:w-[280px]" aria-label="Exercise">
          <SelectValue placeholder="Select exercise" />
        </SelectTrigger>
        <SelectContent>
          {metric === 'relative_strength' ? (
            <SelectItem value={POWERLIFTING_TOTAL_VALUE}>
              Powerlifting total (SBD)
            </SelectItem>
          ) : null}
          {exercises.map((exercise) => (
            <SelectItem key={exercise.id} value={exercise.id}>
              {exercise.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
