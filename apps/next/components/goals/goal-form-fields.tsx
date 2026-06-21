'use client'

import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  COMPOSITION_GOAL_METRICS,
  HABIT_SOURCE_LABELS,
  MILESTONE_TYPE_LABELS,
  getCompositionMetricConfig,
} from '@/lib/goal-progress'
import {
  habitSources,
  milestoneTypes,
  performanceMetrics,
  progressSources,
  TRACKABLE_GOAL_TYPE_OPTIONS,
  type CompositionGoalFormValues,
  type HabitGoalFormValues,
  type MilestoneGoalFormValues,
  type PerformanceGoalFormValues,
  type TrackableGoalCategory,
} from '@/lib/validations/client-goal'
import type { Exercise, Program } from 'app/types/database'

export type { TrackableGoalCategory }
export { TRACKABLE_GOAL_TYPE_OPTIONS }

export function TrackableGoalTypeSelect({
  value,
  onChange,
  disabled,
}: {
  value: TrackableGoalCategory
  onChange: (value: TrackableGoalCategory) => void
  disabled?: boolean
}) {
  const selected = TRACKABLE_GOAL_TYPE_OPTIONS.find(
    (option) => option.value === value
  )

  return (
    <div className="grid gap-2 sm:col-span-2">
      <Label htmlFor="goal-type">Goal type</Label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as TrackableGoalCategory)}
        disabled={disabled}
      >
        <SelectTrigger id="goal-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRACKABLE_GOAL_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {selected.description}
        </p>
      ) : null}
    </div>
  )
}

export function CollapsibleGoalForm({
  addLabel,
  children,
  onSubmit,
  isSubmitting,
}: {
  addLabel: string
  children: React.ReactNode
  onSubmit: () => void
  isSubmitting?: boolean
}) {
  const [open, setOpen] = React.useState(false)

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isSubmitting}
      >
        {addLabel}
      </Button>
    )
  }

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      {children}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onSubmit()
            setOpen(false)
          }}
          disabled={isSubmitting}
        >
          Save goal
        </Button>
      </div>
    </div>
  )
}

export function TargetDateField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-2 sm:col-span-2">
      <Label htmlFor="goal-target-date">Target date</Label>
      <Input
        id="goal-target-date"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

export function CompositionGoalFields({
  values,
  onChange,
  disabled,
}: {
  values: CompositionGoalFormValues
  onChange: (values: CompositionGoalFormValues) => void
  disabled?: boolean
}) {
  const metricConfig = getCompositionMetricConfig(values.metric)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="composition-title">Custom title (optional)</Label>
        <Input
          id="composition-title"
          value={values.title ?? ''}
          onChange={(event) =>
            onChange({
              ...values,
              title: event.target.value || null,
            })
          }
          placeholder="Leave blank to auto-generate"
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Metric</Label>
        <Select
          value={values.metric}
          onValueChange={(metric) => {
            const config = getCompositionMetricConfig(
              metric as CompositionGoalFormValues['metric']
            )
            onChange({
              ...values,
              metric: metric as CompositionGoalFormValues['metric'],
              direction: config?.defaultDirection ?? values.direction,
            })
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPOSITION_GOAL_METRICS.map((metric) => (
              <SelectItem key={metric.key} value={metric.key}>
                {metric.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Direction</Label>
        <Select
          value={values.direction}
          onValueChange={(direction) =>
            onChange({
              ...values,
              direction: direction as CompositionGoalFormValues['direction'],
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="decrease">Decrease / lose</SelectItem>
            <SelectItem value="increase">Increase / gain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="composition-target">Target amount</Label>
        <div className="relative">
          <Input
            id="composition-target"
            type="number"
            min="0"
            step="0.1"
            value={values.targetAmount}
            onChange={(event) =>
              onChange({
                ...values,
                targetAmount: Number(event.target.value),
              })
            }
            disabled={disabled}
            className="pr-14"
          />
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium">
            {metricConfig?.unit ?? 'lbs'}
          </span>
        </div>
      </div>
      {values.metric === 'weight_lbs' ? (
        <div className="grid gap-2">
          <Label>Progress source</Label>
          <Select
            value={values.progressSource ?? 'prefer_inbody'}
            onValueChange={(source) =>
              onChange({
                ...values,
                progressSource: source as CompositionGoalFormValues['progressSource'],
              })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {progressSources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source === 'prefer_inbody'
                    ? 'InBody, fallback to check-ins'
                    : source === 'inbody'
                      ? 'InBody scans only'
                      : 'Check-ins only'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <TargetDateField
        value={values.targetDate}
        onChange={(targetDate) => onChange({ ...values, targetDate })}
        disabled={disabled}
      />
    </div>
  )
}

export function PerformanceGoalFields({
  values,
  onChange,
  exercises,
  disabled,
}: {
  values: PerformanceGoalFormValues
  onChange: (values: PerformanceGoalFormValues) => void
  exercises: Pick<Exercise, 'id' | 'name'>[]
  disabled?: boolean
}) {
  const isTotal = values.performanceMetric === 'powerlifting_total'

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="performance-title">Custom title (optional)</Label>
        <Input
          id="performance-title"
          value={values.title ?? ''}
          onChange={(event) =>
            onChange({ ...values, title: event.target.value || null })
          }
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Metric</Label>
        <Select
          value={values.performanceMetric}
          onValueChange={(metric) =>
            onChange({
              ...values,
              performanceMetric: metric as PerformanceGoalFormValues['performanceMetric'],
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {performanceMetrics.map((metric) => (
              <SelectItem key={metric} value={metric}>
                {metric === 'powerlifting_total'
                  ? 'Powerlifting total'
                  : metric === 'time_seconds'
                    ? 'Time (seconds)'
                    : metric.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Comparison</Label>
        <Select
          value={values.comparison}
          onValueChange={(comparison) =>
            onChange({
              ...values,
              comparison: comparison as PerformanceGoalFormValues['comparison'],
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="at_least">At least</SelectItem>
            <SelectItem value="at_most">At most</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isTotal ? (
        <>
          {(['squatExerciseId', 'benchExerciseId', 'deadliftExerciseId'] as const).map(
            (key, index) => (
              <div key={key} className="grid gap-2">
                <Label>
                  {index === 0 ? 'Squat' : index === 1 ? 'Bench' : 'Deadlift'}
                </Label>
                <Select
                  value={values.metadata?.[key] ?? ''}
                  onValueChange={(exerciseId) =>
                    onChange({
                      ...values,
                      metadata: {
                        ...values.metadata,
                        [key]: exerciseId,
                      },
                    })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    {exercises.map((exercise) => (
                      <SelectItem key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          )}
        </>
      ) : (
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="performance-exercise">Exercise</Label>
          <Select
            value={values.exerciseId ?? ''}
            onValueChange={(exerciseId) =>
              onChange({ ...values, exerciseId: exerciseId || null })
            }
            disabled={disabled}
          >
            <SelectTrigger id="performance-exercise">
              <SelectValue placeholder="Select exercise" />
            </SelectTrigger>
            <SelectContent>
              {exercises.map((exercise) => (
                <SelectItem key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="performance-target">Target</Label>
        <Input
          id="performance-target"
          type="number"
          min="0"
          step="0.1"
          value={values.targetValue}
          onChange={(event) =>
            onChange({
              ...values,
              targetValue: Number(event.target.value),
            })
          }
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="performance-unit">Unit</Label>
        <Input
          id="performance-unit"
          value={values.unit}
          onChange={(event) =>
            onChange({ ...values, unit: event.target.value })
          }
          disabled={disabled}
        />
      </div>
      <TargetDateField
        value={values.targetDate}
        onChange={(targetDate) => onChange({ ...values, targetDate })}
        disabled={disabled}
      />
    </div>
  )
}

export function HabitGoalFields({
  values,
  onChange,
  disabled,
}: {
  values: HabitGoalFormValues
  onChange: (values: HabitGoalFormValues) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="habit-title">Custom title (optional)</Label>
        <Input
          id="habit-title"
          value={values.title ?? ''}
          onChange={(event) =>
            onChange({ ...values, title: event.target.value || null })
          }
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Habit type</Label>
        <Select
          value={values.habitSource}
          onValueChange={(source) =>
            onChange({
              ...values,
              habitSource: source as HabitGoalFormValues['habitSource'],
              targetValue:
                source === 'nutrition_adherence' ? values.targetValue ?? 7 : null,
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {habitSources.map((source) => (
              <SelectItem key={source} value={source}>
                {HABIT_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {values.habitSource === 'nutrition_adherence' ? (
        <div className="grid gap-2">
          <Label htmlFor="habit-adherence-target">Minimum avg (1–10)</Label>
          <Input
            id="habit-adherence-target"
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={values.targetValue ?? 7}
            onChange={(event) =>
              onChange({
                ...values,
                targetValue: Number(event.target.value),
              })
            }
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="habit-frequency">Times per week</Label>
          <Input
            id="habit-frequency"
            type="number"
            min="1"
            step="1"
            value={values.habitFrequency}
            onChange={(event) =>
              onChange({
                ...values,
                habitFrequency: Number(event.target.value),
              })
            }
            disabled={disabled}
          />
        </div>
      )}
      <TargetDateField
        value={values.targetDate}
        onChange={(targetDate) => onChange({ ...values, targetDate })}
        disabled={disabled}
      />
    </div>
  )
}

export function MilestoneGoalFields({
  values,
  onChange,
  programs,
  disabled,
}: {
  values: MilestoneGoalFormValues
  onChange: (values: MilestoneGoalFormValues) => void
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
  disabled?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="milestone-title">Custom title (optional)</Label>
        <Input
          id="milestone-title"
          value={values.title ?? ''}
          onChange={(event) =>
            onChange({ ...values, title: event.target.value || null })
          }
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Milestone type</Label>
        <Select
          value={values.milestoneType}
          onValueChange={(type) =>
            onChange({
              ...values,
              milestoneType: type as MilestoneGoalFormValues['milestoneType'],
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {milestoneTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {MILESTONE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="milestone-target">Target count</Label>
        <Input
          id="milestone-target"
          type="number"
          min="1"
          step="1"
          value={values.milestoneTargetCount}
          onChange={(event) =>
            onChange({
              ...values,
              milestoneTargetCount: Number(event.target.value),
            })
          }
          disabled={disabled}
        />
      </div>
      {values.milestoneType === 'program_completion' ? (
        <div className="grid gap-2 sm:col-span-2">
          <Label>Program</Label>
          <Select
            value={values.programId ?? ''}
            onValueChange={(programId) =>
              onChange({ ...values, programId: programId || null })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {programs
                .filter((program) => program.status !== 'archived')
                .map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <TargetDateField
        value={values.targetDate}
        onChange={(targetDate) => onChange({ ...values, targetDate })}
        disabled={disabled}
      />
    </div>
  )
}

export function DailyGoalFields({
  values,
  onChange,
  disabled,
}: {
  values: import('@/lib/validations/client-goal').DailyGoalFormValues
  onChange: (
    values: import('@/lib/validations/client-goal').DailyGoalFormValues
  ) => void
  disabled?: boolean
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="daily-title">Title</Label>
        <Input
          id="daily-title"
          value={values.title}
          onChange={(event) =>
            onChange({ ...values, title: event.target.value })
          }
          placeholder="Steps, Calories, Water…"
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="daily-target">Target</Label>
        <Input
          id="daily-target"
          type="number"
          min="0"
          step="1"
          value={values.targetValue}
          onChange={(event) =>
            onChange({
              ...values,
              targetValue: Number(event.target.value),
            })
          }
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label>Comparison</Label>
        <Select
          value={values.comparison}
          onValueChange={(comparison) =>
            onChange({
              ...values,
              comparison:
                comparison as import('@/lib/validations/client-goal').DailyGoalFormValues['comparison'],
            })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="at_least">At least</SelectItem>
            <SelectItem value="at_most">At most</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="daily-unit">Unit</Label>
        <Input
          id="daily-unit"
          value={values.unit}
          onChange={(event) =>
            onChange({ ...values, unit: event.target.value })
          }
          placeholder="steps, kcal, oz…"
          disabled={disabled}
        />
      </div>
    </div>
  )
}
