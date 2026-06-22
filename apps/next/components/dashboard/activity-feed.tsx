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
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-4 py-4 sm:px-6 sm:pb-4">
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Sessions, check-ins, and form reviews
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0 sm:px-6 sm:pt-2">
        {items.length === 0 ? (
          <div className="px-4 sm:px-0">
            <EmptyState
              icon={Zap}
              title="No activity yet"
              description="Updates will appear here when clients complete or start their sessions."
              action={{ label: 'View clients', href: '/clients' }}
            />
          </div>
        ) : (
          <ul className="divide-y sm:space-y-3 sm:divide-y-0">
            {items.map((item) => {
              const config = getActivityIcon(item)
              const Icon = config.icon
              const href = getActivityHref(item)
              const isCheckIn = item.kind === 'check_in'
              const isFormReview = item.kind === 'form_review'
              const isHighlighted = isCheckIn || isFormReview
              const mobileActionLabel = isFormReview ? 'Review' : 'View'

              return (
                <li key={`${item.kind}-${item.id}`}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 sm:rounded-lg sm:border sm:bg-card sm:p-4',
                      isHighlighted && 'sm:border-brand/20 sm:bg-brand/[0.02]'
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        config.className
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="body-text truncate leading-snug">
                        <span className="font-medium">{item.clientName}</span>{' '}
                        <span className="text-muted-foreground">
                          {formatActivityMessage(item)}
                        </span>
                      </p>
                      <p className="helper-text mt-0.5">
                        <LiveRelativeTime iso={item.timestamp} />
                      </p>
                    </div>

                    {isCheckIn || isFormReview ? (
                      <Link
                        href={href}
                        className="text-brand inline-flex shrink-0 items-center gap-0.5 text-sm font-medium sm:gap-1.5 sm:rounded-md sm:bg-brand sm:px-4 sm:py-2.5 sm:font-semibold sm:text-white sm:hover:bg-brand/90"
                      >
                        <span className="sm:hidden">
                          {mobileActionLabel}
                          <span aria-hidden> →</span>
                        </span>
                        <span className="hidden sm:inline">
                          {isCheckIn
                            ? (item.groupedCount ?? 1) > 1
                              ? 'View check-ins'
                              : 'View check-in'
                            : (item.groupedCount ?? 1) > 1
                              ? 'View submissions'
                              : 'Review submission'}
                        </span>
                        <ChevronRight className="hidden size-4 sm:block" />
                      </Link>
                    ) : (
                      <Link
                        href={href}
                        className="text-brand inline-flex shrink-0 items-center gap-0.5 text-sm font-medium sm:gap-1"
                      >
                        View
                        <span aria-hidden> →</span>
                      </Link>
                    )}
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
