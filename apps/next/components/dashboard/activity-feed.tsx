import Link from 'next/link'
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  PlayCircle,
  SkipForward,
  Video,
  Zap,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  formatActivityMessage,
  getActivityHref,
  type ActivityItem,
} from '@/lib/dashboard'
import { LiveRelativeTime } from '@/components/ui/live-relative-time'
import {
  getWorkoutActivityIconClass,
  type WorkoutActivityStatus,
} from '@/lib/status-colors'
import { cn } from '@/lib/utils'

const workoutStatusIcons = {
  completed: CheckCircle2,
  in_progress: PlayCircle,
  skipped: SkipForward,
  scheduled: Zap,
} as const

function getActivityIcon(item: ActivityItem) {
  if (item.kind === 'check_in') {
    return {
      icon: CalendarCheck,
      className: 'text-status-success bg-status-success/10',
    }
  }

  if (item.kind === 'form_review') {
    return {
      icon: Video,
      className: 'text-brand bg-brand/10',
    }
  }

  const status = (item.status ?? 'scheduled') as WorkoutActivityStatus
  return {
    icon: workoutStatusIcons[status],
    className: getWorkoutActivityIconClass(status),
  }
}

type ActivityFeedProps = {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Latest session, check-in, and form review updates from your clients
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No activity yet"
            description="Updates will appear here when clients complete or start their sessions."
            action={{ label: 'View clients', href: '/clients' }}
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const config = getActivityIcon(item)
              const Icon = config.icon
              const href = getActivityHref(item)
              const isCheckIn = item.kind === 'check_in'
              const isFormReview = item.kind === 'form_review'
              const isHighlighted = isCheckIn || isFormReview

              const isGrouped = (item.groupedCount ?? 1) > 1

              return (
                <li key={`${item.kind}-${item.id}`}>
                  <div
                    className={cn(
                      'rounded-lg border bg-card p-4',
                      isHighlighted && 'border-brand/20 bg-brand/[0.02]'
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
                          <p className="body-text leading-snug">
                            <span className="font-medium">{item.clientName}</span>{' '}
                            <span className="text-muted-foreground">
                              {formatActivityMessage(item)}
                            </span>
                          </p>
                          <p className="helper-text mt-1">
                            <LiveRelativeTime iso={item.timestamp} />
                          </p>
                        </div>
                      </div>

                      {isCheckIn ? (
                        <Link
                          href={href}
                          className="bg-brand hover:bg-brand/90 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors sm:w-auto sm:min-w-[148px]"
                        >
                          {isGrouped ? 'View check-ins' : 'View check-in'}
                          <ChevronRight className="size-4" />
                        </Link>
                      ) : isFormReview ? (
                        <Link
                          href={href}
                          className="bg-brand hover:bg-brand/90 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors sm:w-auto sm:min-w-[148px]"
                        >
                          {isGrouped ? 'View submissions' : 'Review submission'}
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
