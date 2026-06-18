import Link from 'next/link'
import {
  CheckCircle2,
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
  type ActivityItem,
} from '@/lib/dashboard'
import { cn } from '@/lib/utils'

const statusIcons = {
  completed: { icon: CheckCircle2, className: 'text-brand bg-brand/10' },
  in_progress: { icon: PlayCircle, className: 'text-amber-600 bg-amber-50' },
  skipped: { icon: SkipForward, className: 'text-muted-foreground bg-muted' },
  scheduled: { icon: Zap, className: 'text-muted-foreground bg-muted' },
} as const

type ActivityFeedProps = {
  items: ActivityItem[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base font-semibold">Recent activity</CardTitle>
        <CardDescription>
          Latest session updates from your clients
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
          <ul>
            {items.map((item, index) => {
              const config = statusIcons[item.status]
              const Icon = config.icon

              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 py-4',
                    index !== items.length - 1 && 'border-b'
                  )}
                >
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
                      <Link
                        href={`/clients/${item.clientId}`}
                        className="font-medium hover:text-brand transition-colors"
                      >
                        {item.clientName}
                      </Link>{' '}
                      <span className="text-muted-foreground">
                        {formatActivityMessage(item)}
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatRelativeTime(item.timestamp)}
                    </p>
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
