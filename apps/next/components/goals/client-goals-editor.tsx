'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  createClientGoal,
  deleteClientGoal,
  updateClientGoal,
} from '@/app/(dashboard)/clients/[clientId]/goals/actions'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  formatCompositionGoalLabel,
  formatDailyTargetLabel,
  getCompositionMetricConfig,
} from '@/lib/goal-progress'
import {
  clientGoalToFormValues,
  createEmptyCompositionGoalValues,
  createEmptyDailyGoalValues,
  DAILY_GOAL_PRESETS,
  type ClientGoalFormValues,
  type CompositionGoalFormValues,
  type DailyGoalFormValues,
} from '@/lib/validations/client-goal'
import type { ClientGoal } from 'app/types/database'

type ClientGoalsEditorProps = {
  clientId: string
  goals: ClientGoal[]
  schemaError?: string | null
}

function CompositionGoalFields({
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
    </div>
  )
}

function DailyGoalFields({
  values,
  onChange,
  disabled,
}: {
  values: DailyGoalFormValues
  onChange: (values: DailyGoalFormValues) => void
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
              comparison: comparison as DailyGoalFormValues['comparison'],
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

function GoalListItem({
  goal,
  onUpdate,
  onDelete,
  isDeleting,
  isSubmitting,
}: {
  goal: ClientGoal
  onUpdate: (goalId: string, values: ClientGoalFormValues) => Promise<void>
  onDelete: (goalId: string) => Promise<void>
  isDeleting?: boolean
  isSubmitting?: boolean
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

  const label =
    goal.category === 'daily'
      ? formatDailyTargetLabel(goal)
      : formatCompositionGoalLabel(goal)

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
          <CompositionGoalFields
            values={values as CompositionGoalFormValues}
            onChange={setValues}
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
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-1">
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

export function ClientGoalsEditor({
  clientId,
  goals,
  schemaError = null,
}: ClientGoalsEditorProps) {
  const router = useRouter()
  const dailyGoals = goals.filter((goal) => goal.category === 'daily')
  const compositionGoals = goals.filter((goal) => goal.category === 'composition')

  const [dailyValues, setDailyValues] = React.useState(createEmptyDailyGoalValues())
  const [compositionValues, setCompositionValues] = React.useState(
    createEmptyCompositionGoalValues()
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  if (schemaError?.includes('Could not find the table')) {
    return (
      <SchemaSetupNotice tables={['client_goals']} sqlFile="apply-client-goals.sql" />
    )
  }

  async function handleCreate(values: ClientGoalFormValues) {
    setIsSubmitting(true)
    const result = await createClientGoal(clientId, values)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Goal added')
      setDailyValues(createEmptyDailyGoalValues())
      setCompositionValues(createEmptyCompositionGoalValues())
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
          </div>

          <DailyGoalFields
            values={dailyValues}
            onChange={setDailyValues}
            disabled={isSubmitting}
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void handleCreate(dailyValues)}
              disabled={isSubmitting}
            >
              Add daily target
            </Button>
          </div>

          {dailyGoals.length > 0 ? (
            <div className="grid gap-2">
              {dailyGoals.map((goal) => (
                <GoalListItem
                  key={goal.id}
                  goal={goal}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  isDeleting={deletingId === goal.id}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Body composition goals</CardTitle>
          <CardDescription>
            Progress is calculated from the client&apos;s first and most recent
            InBody scans.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CompositionGoalFields
            values={compositionValues}
            onChange={setCompositionValues}
            disabled={isSubmitting}
          />

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void handleCreate(compositionValues)}
              disabled={isSubmitting}
            >
              <Plus className="size-4" />
              Add composition goal
            </Button>
          </div>

          {compositionGoals.length > 0 ? (
            <div className="grid gap-2">
              {compositionGoals.map((goal) => (
                <GoalListItem
                  key={goal.id}
                  goal={goal}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  isDeleting={deletingId === goal.id}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
