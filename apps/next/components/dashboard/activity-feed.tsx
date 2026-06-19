import Link from 'next/link'
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  SkipForward,
  Zap,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatActivityMessage,
  formatRelativeTime,
  getActivityHref,
  type ActivityItem,
} from '@/lib/dashboard'
import { cn } from '@/lib/utils'

const workoutStatusIcons = {
  completed: { icon: CheckCircle2, className: 'text-brand bg-brand/10' },
  in_progress: { icon: PlayCircle, className: 'text-amber-600 bg-amber-50' },
  skipped: { icon: SkipForward, className: 'text-muted-foreground bg-muted' },
  scheduled: { icon: Zap, className: 'text-muted-foreground bg-muted' },
} as const

function getActivityIcon(item: ActivityItem) {
  if (item.kind === 'check_in') {
    return {
      icon: CalendarCheck,
      className: 'text-brand bg-brand/10',
    }
  }

  const status = item.status ?? 'scheduled'
  return workoutStatusIcons[status]
}

type ActivityFeedProps = {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
        <CardDescription>
          Latest session and check-in updates from your clients
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
            <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <Zap className="text-muted-foreground/60 size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">No activity yet</p>
              <p className="text-xs leading-relaxed">
                Updates will appear here when clients complete or start their sessions.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const config = getActivityIcon(item)
              const Icon = config.icon
              const href = getActivityHref(item)
              const isCheckIn = item.kind === 'check_in'

              return (
                <li key={`${item.kind}-${item.id}`}>
                  <div
                    className={cn(
                      'rounded-lg border bg-card p-4',
                      isCheckIn && 'border-brand/20 bg-brand/[0.02]'
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={cn(
                            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                            config.className
                          )}
                        >
                          <Icon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">{item.clientName}</span>{' '}
                            <span className="text-muted-foreground">
                              {formatActivityMessage(item)}
                            </span>
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatRelativeTime(item.timestamp)}
                          </p>
                        </div>
                      </div>

                      {isCheckIn ? (
                        <Link
                          href={href}
                          className="bg-brand hover:bg-brand/90 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors sm:w-auto sm:min-w-[148px]"
                        >
                          View check-in
                          <ChevronRight className="size-4" />
                        </Link>
                      ) : (
                        <Link
                          href={href}
                          className="text-brand hover:text-brand/80 inline-flex w-full items-center justify-center gap-1 text-sm font-medium transition-colors sm:w-auto sm:justify-end"
                        >
                          View client
                          <ChevronRight className="size-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
