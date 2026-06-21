'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createClientGoal,
  deleteClientGoal,
  updateClientGoal,
} from '@/app/(dashboard)/clients/[clientId]/goals/actions'
import {
  CollapsibleGoalForm,
  CompositionGoalFields,
  DailyGoalFields,
  HabitGoalFields,
  MilestoneGoalFields,
  PerformanceGoalFields,
  TrackableGoalTypeSelect,
} from '@/components/goals/goal-form-fields'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { sortClientGoals } from '@/lib/goal-progress'
import {
  clientGoalToFormValues,
  createEmptyDailyGoalValues,
  createEmptyTrackableGoalValues,
  DAILY_GOAL_PRESETS,
  formatGoalListLabel,
  getTrackableGoalCategoryLabel,
  type ClientGoalFormValues,
  type CompositionGoalFormValues,
  type DailyGoalFormValues,
  type HabitGoalFormValues,
  type MilestoneGoalFormValues,
  type PerformanceGoalFormValues,
  type TrackableGoalCategory,
} from '@/lib/validations/client-goal'
import type { ClientGoal, Exercise, Program } from 'app/types/database'

type ClientGoalsEditorProps = {
  clientId: string
  goals: ClientGoal[]
  exercises: Pick<Exercise, 'id' | 'name'>[]
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
  schemaError?: string | null
}

function TrackableGoalFields({
  category,
  values,
  onChange,
  exercises,
  programs,
  disabled,
}: {
  category: TrackableGoalCategory
  values: ClientGoalFormValues
  onChange: (values: ClientGoalFormValues) => void
  exercises: Pick<Exercise, 'id' | 'name'>[]
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
  disabled?: boolean
}) {
  switch (category) {
    case 'performance':
      return (
        <PerformanceGoalFields
          values={values as PerformanceGoalFormValues}
          onChange={onChange}
          exercises={exercises}
          disabled={disabled}
        />
      )
    case 'habit':
      return (
        <HabitGoalFields
          values={values as HabitGoalFormValues}
          onChange={onChange}
          disabled={disabled}
        />
      )
    case 'milestone':
      return (
        <MilestoneGoalFields
          values={values as MilestoneGoalFormValues}
          onChange={onChange}
          programs={programs}
          disabled={disabled}
        />
      )
    default:
      return (
        <CompositionGoalFields
          values={values as CompositionGoalFormValues}
          onChange={onChange}
          disabled={disabled}
        />
      )
  }
}

function GoalListItem({
  goal,
  onUpdate,
  onDelete,
  isDeleting,
  isSubmitting,
  exercises,
  programs,
}: {
  goal: ClientGoal
  onUpdate: (goalId: string, values: ClientGoalFormValues) => Promise<void>
  onDelete: (goalId: string) => Promise<void>
  isDeleting?: boolean
  isSubmitting?: boolean
  exercises: Pick<Exercise, 'id' | 'name'>[]
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
}) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [values, setValues] = React.useState<ClientGoalFormValues>(() =>
    clientGoalToFormValues(goal)
  )

  React.useEffect(() => {
    if (!isEditing) {
      setValues(clientGoalToFormValues(goal))
    }
  }, [goal, isEditing])

  const label = formatGoalListLabel(goal)
  const categoryLabel =
    goal.category !== 'daily'
      ? getTrackableGoalCategoryLabel(goal.category)
      : null

  async function handleSave() {
    await onUpdate(goal.id, values)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="grid gap-3 rounded-lg border p-3">
        {goal.category === 'daily' ? (
          <DailyGoalFields
            values={values as DailyGoalFormValues}
            onChange={setValues}
            disabled={isSubmitting}
          />
        ) : (
          <TrackableGoalFields
            category={goal.category}
            values={values}
            onChange={setValues}
            exercises={exercises}
            programs={programs}
            disabled={isSubmitting}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setValues(clientGoalToFormValues(goal))
              setIsEditing(false)
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
          >
            Save changes
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {categoryLabel ? (
          <Badge variant="secondary" className="shrink-0">
            {categoryLabel}
          </Badge>
        ) : null}
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          disabled={isDeleting || isSubmitting}
          aria-label="Edit goal"
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void onDelete(goal.id)}
          disabled={isDeleting || isSubmitting}
          aria-label="Delete goal"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function GoalList({
  goals,
  onUpdate,
  onDelete,
  deletingId,
  isSubmitting,
  exercises,
  programs,
}: {
  goals: ClientGoal[]
  onUpdate: (goalId: string, values: ClientGoalFormValues) => Promise<void>
  onDelete: (goalId: string) => Promise<void>
  deletingId: string | null
  isSubmitting: boolean
  exercises: Pick<Exercise, 'id' | 'name'>[]
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
}) {
  if (goals.length === 0) return null

  return (
    <div className="grid gap-2">
      {goals.map((goal) => (
        <GoalListItem
          key={goal.id}
          goal={goal}
          onUpdate={onUpdate}
          onDelete={onDelete}
          isDeleting={deletingId === goal.id}
          isSubmitting={isSubmitting}
          exercises={exercises}
          programs={programs}
        />
      ))}
    </div>
  )
}

export function ClientGoalsEditor({
  clientId,
  goals,
  exercises,
  programs,
  schemaError = null,
}: ClientGoalsEditorProps) {
  const router = useRouter()
  const { dailyGoals, trackableGoals } = React.useMemo(() => {
    const daily = goals.filter((goal) => goal.category === 'daily')
    const trackable = sortClientGoals(
      goals.filter((goal) => goal.category !== 'daily')
    )
    return { dailyGoals: daily, trackableGoals: trackable }
  }, [goals])

  const [dailyValues, setDailyValues] = React.useState(createEmptyDailyGoalValues())
  const [addGoalType, setAddGoalType] =
    React.useState<TrackableGoalCategory>('composition')
  const [addGoalValues, setAddGoalValues] = React.useState<ClientGoalFormValues>(
    createEmptyTrackableGoalValues('composition')
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  function handleAddGoalTypeChange(category: TrackableGoalCategory) {
    setAddGoalType(category)
    setAddGoalValues(createEmptyTrackableGoalValues(category))
  }

  if (schemaError?.includes('Could not find the table')) {
    return (
      <SchemaSetupNotice
        tables={['client_goals']}
        sqlFile="apply-client-goals-v2.sql"
      />
    )
  }

  async function handleCreate(values: ClientGoalFormValues) {
    setIsSubmitting(true)
    const result = await createClientGoal(clientId, values)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Goal added')
      setDailyValues(createEmptyDailyGoalValues())
      setAddGoalType('composition')
      setAddGoalValues(createEmptyTrackableGoalValues('composition'))
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleUpdate(goalId: string, values: ClientGoalFormValues) {
    setIsSubmitting(true)
    const result = await updateClientGoal(goalId, values)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Goal updated')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(goalId: string) {
    setDeletingId(goalId)
    const result = await deleteClientGoal(goalId)
    setDeletingId(null)

    if (result.success) {
      toast.success('Goal removed')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const listProps = {
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    deletingId,
    isSubmitting,
    exercises,
    programs,
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily targets</CardTitle>
          <CardDescription>
            Set daily expectations your client will see as reminders on their
            Goals page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {DAILY_GOAL_PRESETS.map((preset) => (
              <Button
                key={`${preset.title}-${preset.unit}`}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDailyValues(preset)}
                disabled={isSubmitting}
              >
                {preset.title}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDailyValues({
                  category: 'daily',
                  title: '',
                  targetValue: 1,
                  comparison: 'at_least',
                  unit: '',
                })
              }
              disabled={isSubmitting}
            >
              Custom
            </Button>
          </div>

          <CollapsibleGoalForm
            addLabel="Add daily target"
            onSubmit={() => void handleCreate(dailyValues)}
            isSubmitting={isSubmitting}
          >
            <DailyGoalFields
              values={dailyValues}
              onChange={setDailyValues}
              disabled={isSubmitting}
            />
          </CollapsibleGoalForm>

          <GoalList goals={dailyGoals} {...listProps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Goals</CardTitle>
          <CardDescription>
            Set progress-tracked goals for body composition, performance, habits,
            and milestones. Progress updates automatically from workouts,
            check-ins, and scans.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CollapsibleGoalForm
            addLabel="Add goal"
            onSubmit={() => void handleCreate(addGoalValues)}
            isSubmitting={isSubmitting}
          >
            <div className="grid gap-4">
              <TrackableGoalTypeSelect
                value={addGoalType}
                onChange={handleAddGoalTypeChange}
                disabled={isSubmitting}
              />
              <TrackableGoalFields
                category={addGoalType}
                values={addGoalValues}
                onChange={setAddGoalValues}
                exercises={exercises}
                programs={programs}
                disabled={isSubmitting}
              />
            </div>
          </CollapsibleGoalForm>

          {trackableGoals.length === 0 ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              No goals yet. Add one to start tracking progress.
            </p>
          ) : (
            <GoalList goals={trackableGoals} {...listProps} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
