'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateTeamPowerliftingExercises } from '@/app/(dashboard)/teams/feature-actions'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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

const LIFTS = [
  { key: 'squat' as const, label: 'Squat', ariaLabel: 'Squat exercise' },
  { key: 'bench' as const, label: 'Bench', ariaLabel: 'Bench exercise' },
  { key: 'deadlift' as const, label: 'Deadlift', ariaLabel: 'Deadlift exercise' },
]

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

  const values = {
    squat: squatExerciseId,
    bench: benchExerciseId,
    deadlift: deadliftExerciseId,
  }

  const setters = {
    squat: setSquatExerciseId,
    bench: setBenchExerciseId,
    deadlift: setDeadliftExerciseId,
  }

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

  async function handleChange(
    lift: 'squat' | 'bench' | 'deadlift',
    value: string
  ) {
    const previous = values[lift]
    setters[lift](value)
    await saveValues({
      squatExerciseId: lift === 'squat' ? value : squatExerciseId,
      benchExerciseId: lift === 'bench' ? value : benchExerciseId,
      deadliftExerciseId: lift === 'deadlift' ? value : deadliftExerciseId,
    }).catch(() => setters[lift](previous))
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
        <CardTitle className="text-sm font-semibold">Leaderboard lifts (SBD)</CardTitle>
        <CardDescription className="text-xs">
          Map lifts for Wilks / DOTS powerlifting totals.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {LIFTS.map((lift) => (
            <div key={lift.key} className="min-w-0 space-y-1.5">
              <Label className="text-muted-foreground text-xs font-medium">
                {lift.label}
              </Label>
              <Select
                value={values[lift.key]}
                onValueChange={(value) => void handleChange(lift.key, value)}
                disabled={disabled || pending}
              >
                <SelectTrigger
                  className="h-9 w-full text-xs"
                  aria-label={lift.ariaLabel}
                >
                  <SelectValue placeholder="Auto-det" />
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
