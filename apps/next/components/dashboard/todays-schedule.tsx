import Link from 'next/link'
import { Calendar, CheckCircle2, Circle, PlayCircle, SkipForward } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatSessionTime, type TodaySession } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

const statusConfig = {
  scheduled: {
    icon: Circle,
    label: 'Scheduled',
    dotClass: 'bg-muted-foreground/40',
    iconClass: 'text-muted-foreground',
  },
  in_progress: {
    icon: PlayCircle,
    label: 'In progress',
    dotClass: 'bg-amber-400',
    iconClass: 'text-amber-600',
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    dotClass: 'bg-brand',
    iconClass: 'text-brand',
  },
  skipped: {
    icon: SkipForward,
    label: 'Skipped',
    dotClass: 'bg-muted-foreground/30',
    iconClass: 'text-muted-foreground',
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
    <Card className="h-full">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Today&apos;s schedule
            </CardTitle>
            <CardDescription>{todayLabel}</CardDescription>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 font-normal"
          >
            {sessions.length} session{sessions.length === 1 ? '' : 's'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {sessions.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
            <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <Calendar className="text-muted-foreground/60 size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Nothing scheduled</p>
              <p className="text-xs leading-relaxed">
                Assign a session from a client&apos;s calendar when you&apos;re ready.
              </p>
            </div>
            <Link
              href="/clients"
              className="text-brand text-sm font-medium underline-offset-4 hover:underline"
            >
              View clients
            </Link>
          </div>
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
                        <span className="text-sm font-medium">
                          {session.clientName}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {formatSessionTime(session.started_at)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-sm">
                        {session.name}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          className={cn('size-1.5 rounded-full', config.dotClass)}
                        />
                        <span className="text-muted-foreground text-xs">
                          {config.label}
                        </span>
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
