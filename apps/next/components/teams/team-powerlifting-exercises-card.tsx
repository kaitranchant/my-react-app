'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateTeamPowerliftingExercises } from '@/app/(dashboard)/teams/feature-actions'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Team } from 'app/types/database'

type ExerciseOption = {
  id: string
  name: string
}

type TeamPowerliftingExercisesCardProps = {
  team: Team
  exercises: ExerciseOption[]
  disabled?: boolean
}

const UNSET_VALUE = 'none'

function toSelectValue(exerciseId: string | null | undefined): string {
  return exerciseId ?? UNSET_VALUE
}

export function TeamPowerliftingExercisesCard({
  team,
  exercises,
  disabled = false,
}: TeamPowerliftingExercisesCardProps) {
  const [squatExerciseId, setSquatExerciseId] = React.useState(
    toSelectValue(team.squat_exercise_id)
  )
  const [benchExerciseId, setBenchExerciseId] = React.useState(
    toSelectValue(team.bench_exercise_id)
  )
  const [deadliftExerciseId, setDeadliftExerciseId] = React.useState(
    toSelectValue(team.deadlift_exercise_id)
  )
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setSquatExerciseId(toSelectValue(team.squat_exercise_id))
    setBenchExerciseId(toSelectValue(team.bench_exercise_id))
    setDeadliftExerciseId(toSelectValue(team.deadlift_exercise_id))
  }, [
    team.squat_exercise_id,
    team.bench_exercise_id,
    team.deadlift_exercise_id,
  ])

  async function saveValues(nextValues: {
    squatExerciseId: string
    benchExerciseId: string
    deadliftExerciseId: string
  }) {
    setPending(true)
    const result = await updateTeamPowerliftingExercises(team.id, nextValues)
    setPending(false)

    if (result.success) {
      toast.success('Leaderboard lifts updated')
      return
    }

    toast.error(result.error)
    setSquatExerciseId(toSelectValue(team.squat_exercise_id))
    setBenchExerciseId(toSelectValue(team.bench_exercise_id))
    setDeadliftExerciseId(toSelectValue(team.deadlift_exercise_id))
  }

  async function handleSquatChange(value: string) {
    const previous = squatExerciseId
    setSquatExerciseId(value)
    await saveValues({
      squatExerciseId: value,
      benchExerciseId,
      deadliftExerciseId,
    }).catch(() => setSquatExerciseId(previous))
  }

  async function handleBenchChange(value: string) {
    const previous = benchExerciseId
    setBenchExerciseId(value)
    await saveValues({
      squatExerciseId,
      benchExerciseId: value,
      deadliftExerciseId,
    }).catch(() => setBenchExerciseId(previous))
  }

  async function handleDeadliftChange(value: string) {
    const previous = deadliftExerciseId
    setDeadliftExerciseId(value)
    await saveValues({
      squatExerciseId,
      benchExerciseId,
      deadliftExerciseId: value,
    }).catch(() => setDeadliftExerciseId(previous))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard lifts</CardTitle>
        <CardDescription>
          Map squat, bench, and deadlift for Wilks / DOTS powerlifting totals.
          Unset lifts fall back to exercise name matching.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsRow
          label="Squat"
          description="Used when ranking by powerlifting total (SBD)."
        >
          <Select
            value={squatExerciseId}
            onValueChange={(value) => void handleSquatChange(value)}
            disabled={disabled || pending}
          >
            <SelectTrigger className="w-full sm:w-[240px]" aria-label="Squat exercise">
              <SelectValue placeholder="Auto-detect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET_VALUE}>Auto-detect</SelectItem>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Bench press" description="Bench portion of SBD total.">
          <Select
            value={benchExerciseId}
            onValueChange={(value) => void handleBenchChange(value)}
            disabled={disabled || pending}
          >
            <SelectTrigger className="w-full sm:w-[240px]" aria-label="Bench exercise">
              <SelectValue placeholder="Auto-detect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET_VALUE}>Auto-detect</SelectItem>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label="Deadlift" description="Deadlift portion of SBD total.">
          <Select
            value={deadliftExerciseId}
            onValueChange={(value) => void handleDeadliftChange(value)}
            disabled={disabled || pending}
          >
            <SelectTrigger
              className="w-full sm:w-[240px]"
              aria-label="Deadlift exercise"
            >
              <SelectValue placeholder="Auto-detect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNSET_VALUE}>Auto-detect</SelectItem>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </CardContent>
    </Card>
  )
}
