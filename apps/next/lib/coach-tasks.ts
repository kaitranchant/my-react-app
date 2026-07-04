import type { CoachTaskPriority, CoachTaskStatus } from '@/lib/validations/coach-tasks'

export type CoachTask = {
  id: string
  coach_id: string
  client_id: string | null
  title: string
  details: string | null
  due_date: string | null
  priority: CoachTaskPriority
  status: CoachTaskStatus
  completed_at: string | null
  created_at: string
  updated_at: string
  client?: { id: string; full_name: string | null } | null
}

export type CoachTaskFilter = 'active' | 'completed' | 'all'

export const coachTaskPriorityLabels: Record<CoachTaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export function isCoachTaskOverdue(
  task: Pick<CoachTask, 'status' | 'due_date'>,
  todayKey: string
): boolean {
  return (
    task.status === 'pending' &&
    Boolean(task.due_date) &&
    task.due_date! < todayKey
  )
}

export function isCoachTaskDueToday(
  task: Pick<CoachTask, 'due_date'>,
  todayKey: string
): boolean {
  return Boolean(task.due_date) && task.due_date === todayKey
}

export function sortCoachTasks(tasks: CoachTask[], todayKey: string): CoachTask[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1
    }

    if (a.status === 'completed' && b.status === 'completed') {
      const aCompleted = a.completed_at ? Date.parse(a.completed_at) : 0
      const bCompleted = b.completed_at ? Date.parse(b.completed_at) : 0
      return bCompleted - aCompleted
    }

    const aOverdue = isCoachTaskOverdue(a, todayKey)
    const bOverdue = isCoachTaskOverdue(b, todayKey)
    if (aOverdue !== bOverdue) {
      return aOverdue ? -1 : 1
    }

    const aDue = a.due_date
    const bDue = b.due_date
    if (aDue && bDue) {
      if (aDue !== bDue) return aDue.localeCompare(bDue)
    } else if (aDue !== bDue) {
      return aDue ? -1 : 1
    }

    const priorityRank: Record<CoachTaskPriority, number> = {
      high: 0,
      normal: 1,
      low: 2,
    }
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority]
    }

    return Date.parse(b.created_at) - Date.parse(a.created_at)
  })
}

export function filterCoachTasks(
  tasks: CoachTask[],
  filter: CoachTaskFilter
): CoachTask[] {
  if (filter === 'all') return tasks
  if (filter === 'completed') {
    return tasks.filter((task) => task.status === 'completed')
  }
  return tasks.filter((task) => task.status === 'pending')
}

export function formatCoachTaskDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null

  const [year, month, day] = dueDate.split('-').map(Number)
  if (!year || !month || !day) return dueDate

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}
