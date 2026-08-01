import Link from 'next/link'
import { ArrowRight, CalendarClock, ListTodo } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatCoachTaskDueDate,
  isCoachTaskDueToday,
  isCoachTaskOverdue,
  sortCoachTasks,
  type CoachTask,
} from '@/lib/coach-tasks'
import { cn } from '@/lib/utils'

type HighPriorityTasksProps = {
  tasks: CoachTask[]
  todayKey: string
}

export function HighPriorityTasks({ tasks, todayKey }: HighPriorityTasksProps) {
  if (tasks.length === 0) return null

  const sorted = sortCoachTasks(tasks, todayKey)

  return (
    <Card className="gap-0 overflow-hidden border-status-danger/40 py-0 shadow-card">
      <CardHeader className="border-b border-status-danger/20 bg-status-danger/5 px-4 py-4 sm:px-6 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="bg-status-danger/15 text-status-danger flex size-8 items-center justify-center rounded-lg">
                <ListTodo className="size-4" />
              </div>
              <CardTitle>High priority tasks</CardTitle>
            </div>
            <CardDescription>
              {sorted.length} open task{sorted.length === 1 ? '' : 's'} that need
              your attention first
            </CardDescription>
          </div>
          <Link
            href="/scheduling?view=tasks"
            className="text-brand hover:text-brand/80 helper-text inline-flex items-center gap-1 font-medium"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-0 py-0 sm:px-6 sm:pt-4 sm:pb-5">
        <ul className="divide-y">
          {sorted.map((task) => {
            const overdue = isCoachTaskOverdue(task, todayKey)
            const dueToday = isCoachTaskDueToday(task, todayKey)
            const dueLabel = formatCoachTaskDueDate(task.due_date)
            const clientName = task.client?.full_name?.trim()

            return (
              <li key={task.id}>
                <Link
                  href="/scheduling?view=tasks"
                  className="hover:bg-status-danger/5 flex items-start gap-3 px-4 py-3.5 transition-colors sm:rounded-lg sm:px-3 sm:py-3"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="section-header text-foreground leading-snug">
                        {task.title}
                      </p>
                      <Badge variant="destructive" className="text-[10px]">
                        High
                      </Badge>
                      {overdue ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Overdue
                        </Badge>
                      ) : dueToday ? (
                        <Badge className="text-[10px]">Due today</Badge>
                      ) : null}
                    </div>
                    {task.details?.trim() ? (
                      <p className="helper-text line-clamp-2 text-muted-foreground">
                        {task.details.trim()}
                      </p>
                    ) : null}
                    <div className="helper-text text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                      {dueLabel ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            overdue && 'text-status-danger'
                          )}
                        >
                          <CalendarClock className="size-3.5 shrink-0" />
                          {dueLabel}
                        </span>
                      ) : null}
                      {clientName ? <span>{clientName}</span> : null}
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0" />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
