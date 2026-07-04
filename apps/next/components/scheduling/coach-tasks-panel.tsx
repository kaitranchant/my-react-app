'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  createCoachTask,
  deleteCoachTask,
  updateCoachTask,
  updateCoachTaskStatus,
} from '@/app/(dashboard)/scheduling/task-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  coachTaskPriorityLabels,
  filterCoachTasks,
  formatCoachTaskDueDate,
  isCoachTaskDueToday,
  isCoachTaskOverdue,
  sortCoachTasks,
  type CoachTask,
  type CoachTaskFilter,
} from '@/lib/coach-tasks'
import {
  coachTaskPriorities,
  type CoachTaskFormValues,
  type CoachTaskPriority,
} from '@/lib/validations/coach-tasks'
import { cn } from '@/lib/utils'

type CoachTasksPanelProps = {
  tasks: CoachTask[]
  clients: Array<{ id: string; full_name: string | null }>
  todayKey: string
}

const emptyFormValues: CoachTaskFormValues = {
  title: '',
  details: '',
  dueDate: '',
  priority: 'normal',
  clientId: '',
}

function taskToFormValues(task: CoachTask): CoachTaskFormValues {
  return {
    title: task.title,
    details: task.details ?? '',
    dueDate: task.due_date ?? '',
    priority: task.priority,
    clientId: task.client_id ?? '',
  }
}

function CoachTaskFormDialog({
  open,
  onOpenChange,
  initialValues,
  clients,
  taskId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues: CoachTaskFormValues
  clients: Array<{ id: string; full_name: string | null }>
  taskId?: string
  onSaved: () => void
}) {
  const [pending, setPending] = React.useState(false)
  const [values, setValues] = React.useState(initialValues)

  React.useEffect(() => {
    if (open) {
      setValues(initialValues)
    }
  }, [initialValues, open])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)

    const result = taskId
      ? await updateCoachTask(taskId, values)
      : await createCoachTask(values)

    setPending(false)

    if (result.success) {
      toast.success(taskId ? 'Task updated.' : 'Task added.')
      onOpenChange(false)
      onSaved()
      return
    }

    toast.error(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{taskId ? 'Edit task' : 'Add task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coach-task-title">Title</Label>
            <Input
              id="coach-task-title"
              value={values.title}
              onChange={(event) =>
                setValues((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Follow up with Alex about nutrition plan"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coach-task-details">Details</Label>
            <Textarea
              id="coach-task-details"
              value={values.details ?? ''}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  details: event.target.value,
                }))
              }
              placeholder="Important context, links, or next steps…"
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coach-task-due-date">Due date</Label>
              <Input
                id="coach-task-due-date"
                type="date"
                value={values.dueDate ?? ''}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={values.priority}
                onValueChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    priority: value as CoachTaskPriority,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {coachTaskPriorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {coachTaskPriorityLabels[priority]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Related client (optional)</Label>
            <Select
              value={values.clientId || '__none__'}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  clientId: value === '__none__' ? '' : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name?.trim() || 'Unnamed client'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !values.title.trim()}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {taskId ? 'Save changes' : 'Add task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CoachTaskRow({
  task,
  todayKey,
  toggling,
  onEdit,
  onToggle,
  onDelete,
}: {
  task: CoachTask
  todayKey: string
  toggling: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const overdue = isCoachTaskOverdue(task, todayKey)
  const dueToday = isCoachTaskDueToday(task, todayKey)
  const completed = task.status === 'completed'

  return (
    <li
      className={cn(
        'flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors',
        completed && 'bg-muted/30 opacity-80',
        overdue && !completed && 'border-destructive/30 bg-destructive/5'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={toggling}
        className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 disabled:opacity-60"
        aria-label={completed ? 'Mark task incomplete' : 'Mark task complete'}
      >
        {completed ? (
          <CheckCircle2 className="text-status-success size-5" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              'font-medium',
              completed && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </p>
          {task.priority === 'high' && !completed ? (
            <Badge variant="destructive" className="text-[10px]">
              High
            </Badge>
          ) : null}
          {overdue ? (
            <Badge variant="destructive" className="text-[10px]">
              Overdue
            </Badge>
          ) : dueToday ? (
            <Badge className="text-[10px]">Due today</Badge>
          ) : null}
        </div>

        {task.details?.trim() ? (
          <p className="text-muted-foreground text-sm leading-snug whitespace-pre-wrap">
            {task.details.trim()}
          </p>
        ) : null}

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {task.due_date ? (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3.5" />
              {formatCoachTaskDueDate(task.due_date)}
            </span>
          ) : (
            <span>No due date</span>
          )}
          {task.client?.full_name ? (
            <span>{task.client.full_name.trim()}</span>
          ) : null}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Task options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

export function CoachTasksPanel({
  tasks,
  clients,
  todayKey,
}: CoachTasksPanelProps) {
  const router = useRouter()
  const [filter, setFilter] = React.useState<CoachTaskFilter>('active')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<CoachTask | null>(null)
  const [localTasks, setLocalTasks] = React.useState(tasks)
  const [togglingTaskIds, setTogglingTaskIds] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const visibleTasks = React.useMemo(
    () => sortCoachTasks(filterCoachTasks(localTasks, filter), todayKey),
    [filter, localTasks, todayKey]
  )

  const pendingCount = localTasks.filter((task) => task.status === 'pending').length
  const overdueCount = localTasks.filter((task) =>
    isCoachTaskOverdue(task, todayKey)
  ).length

  function refresh() {
    router.refresh()
  }

  async function handleToggle(task: CoachTask) {
    if (togglingTaskIds.has(task.id)) {
      return
    }

    const nextStatus = task.status === 'completed' ? 'pending' : 'completed'
    const optimisticTask: CoachTask = {
      ...task,
      status: nextStatus,
      completed_at:
        nextStatus === 'completed' ? new Date().toISOString() : null,
    }

    setTogglingTaskIds((current) => new Set(current).add(task.id))
    setLocalTasks((current) =>
      current.map((entry) => (entry.id === task.id ? optimisticTask : entry))
    )

    const result = await updateCoachTaskStatus(task.id, nextStatus)

    setTogglingTaskIds((current) => {
      const next = new Set(current)
      next.delete(task.id)
      return next
    })

    if (result.success) {
      return
    }

    setLocalTasks((current) =>
      current.map((entry) => (entry.id === task.id ? task : entry))
    )
    toast.error(result.error)
  }

  async function handleDelete(task: CoachTask) {
    const previousTasks = localTasks
    setLocalTasks((current) => current.filter((entry) => entry.id !== task.id))

    const result = await deleteCoachTask(task.id)
    if (result.success) {
      toast.success('Task deleted.')
      return
    }

    setLocalTasks(previousTasks)
    toast.error(result.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {pendingCount} open {pendingCount === 1 ? 'task' : 'tasks'}
          </p>
          {overdueCount > 0 ? (
            <p className="text-destructive text-xs">
              {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Track follow-ups, admin work, and prep with due dates.
            </p>
          )}
        </div>

        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add task
        </Button>
      </div>

      <Tabs
        value={filter}
        onValueChange={(value) => setFilter(value as CoachTaskFilter)}
      >
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {visibleTasks.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={filter === 'completed' ? 'No completed tasks yet' : 'No tasks yet'}
          description={
            filter === 'completed'
              ? 'Finished tasks will show up here.'
              : 'Add your first to-do with a due date and any important details.'
          }
          action={
            filter === 'completed'
              ? undefined
              : {
                  label: 'Add task',
                  onClick: () => setCreateOpen(true),
                }
          }
        />
      ) : (
        <ul className="space-y-2">
          {visibleTasks.map((task) => (
            <CoachTaskRow
              key={task.id}
              task={task}
              todayKey={todayKey}
              toggling={togglingTaskIds.has(task.id)}
              onEdit={() => setEditingTask(task)}
              onToggle={() => void handleToggle(task)}
              onDelete={() => void handleDelete(task)}
            />
          ))}
        </ul>
      )}

      <CoachTaskFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialValues={emptyFormValues}
        clients={clients}
        onSaved={refresh}
      />

      <CoachTaskFormDialog
        open={Boolean(editingTask)}
        onOpenChange={(open) => {
          if (!open) setEditingTask(null)
        }}
        initialValues={editingTask ? taskToFormValues(editingTask) : emptyFormValues}
        clients={clients}
        taskId={editingTask?.id}
        onSaved={() => {
          setEditingTask(null)
          refresh()
        }}
      />
    </div>
  )
}
