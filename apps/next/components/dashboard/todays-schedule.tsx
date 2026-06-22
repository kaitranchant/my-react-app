import Link from 'next/link'
import { Calendar, CheckCircle2, Circle, PlayCircle, SkipForward } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { formatSessionTime, type TodaySession } from '@/lib/dashboard'
import { statusDotClass, statusIconClass } from '@/lib/status-colors'
import { cn } from '@/lib/utils'

const statusConfig = {
  scheduled: {
    icon: Circle,
    label: 'Scheduled',
    dotClass: statusDotClass.neutral,
    iconClass: statusIconClass.neutral,
  },
  in_progress: {
    icon: PlayCircle,
    label: 'In progress',
    dotClass: statusDotClass.warning,
    iconClass: statusIconClass.warning,
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    dotClass: statusDotClass.success,
    iconClass: statusIconClass.success,
  },
  skipped: {
    icon: SkipForward,
    label: 'Skipped',
    dotClass: statusDotClass.neutral,
    iconClass: statusIconClass.neutral,
  },
} as const

type TodaysScheduleProps = {
  sessions: TodaySession[]
}

export function TodaysSchedule({ sessions }: TodaysScheduleProps) {
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card className="h-full gap-0 py-0">
      <CardHeader className="border-b px-4 py-4 sm:px-6 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Today&apos;s schedule</CardTitle>
            <CardDescription className="hidden sm:block">{todayLabel}</CardDescription>
          </div>
          <Badge variant="secondary" className="shrink-0 font-normal">
            {sessions.length} session{sessions.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4 sm:px-6 sm:pt-5">
        {sessions.length === 0 ? (
          <>
            <div className="space-y-4 sm:hidden">
              <p className="helper-text">Nothing scheduled today</p>
              <div className="flex justify-end">
                <Link
                  href="/clients"
                  className="text-brand inline-flex items-center gap-1 text-sm font-medium"
                >
                  Schedule
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
            <EmptyState
              className="hidden sm:flex"
              icon={Calendar}
              title="Nothing scheduled"
              description="Assign a session from a client's calendar when you're ready."
              action={{ label: 'Schedule a workout', href: '/clients' }}
            />
          </>
        ) : (
          <ol className="space-y-1">
            {sessions.map((session) => {
              const config = statusConfig[session.status]
              const Icon = config.icon

              return (
                <li key={session.id}>
                  <Link
                    href={`/clients/${session.client_id}`}
                    className="hover:bg-muted/60 flex items-start gap-3 rounded-lg p-3 transition-colors"
                  >
                    <div
                      className={cn(
                        'mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60',
                        config.iconClass
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <span className="body-text font-medium">
                          {session.clientName}
                        </span>
                        <span className="helper-text shrink-0">
                          {formatSessionTime(session.started_at)}
                        </span>
                      </div>
                      <p className="helper-text mt-0.5">{session.name}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          className={cn('size-1.5 rounded-full', config.dotClass)}
                        />
                        <span className="helper-text">{config.label}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
