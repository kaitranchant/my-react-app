'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Bell,
  CalendarCheck,
  Mail,
  TrendingUp,
  UserPlus,
  Video,
  Zap,
} from 'lucide-react'

import { LiveRelativeTime } from '@/components/ui/live-relative-time'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { CoachNotificationItem } from '@/lib/coach-notifications'
import { cn } from '@/lib/utils'

const kindIcons = {
  message: Mail,
  form_review: Video,
  check_in: CalendarCheck,
  overload: TrendingUp,
  invite: UserPlus,
  workout: Zap,
} as const

type CoachNotificationCenterProps = {
  items: CoachNotificationItem[]
}

export function CoachNotificationCenter({ items }: CoachNotificationCenterProps) {
  const [open, setOpen] = React.useState(false)
  const actionableCount = items.filter((item) => item.priority === 'high').length

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative shrink-0"
        onClick={() => setOpen(true)}
        aria-label={
          actionableCount > 0
            ? `Notifications, ${actionableCount} need attention`
            : 'Notifications'
        }
      >
        <Bell className="size-5" />
        {actionableCount > 0 ? (
          <span className="bg-brand text-brand-foreground absolute -top-0.5 -right-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none">
            {actionableCount > 9 ? '9+' : actionableCount}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle>Notifications</SheetTitle>
            <p className="text-muted-foreground text-sm">
              Action items and recent client activity
            </p>
          </SheetHeader>

          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-y-contain p-2">
            {items.length === 0 ? (
              <div className="text-muted-foreground px-3 py-12 text-center text-sm">
                You&apos;re all caught up. New client activity will show up here.
              </div>
            ) : (
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = kindIcons[item.kind]

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'hover:bg-muted flex items-start gap-3 rounded-lg px-3 py-3 transition-colors',
                          item.priority === 'high' && 'bg-brand/5 hover:bg-brand/10'
                        )}
                      >
                        <div
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg',
                            item.priority === 'high'
                              ? 'bg-brand/10 text-brand'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm leading-snug font-medium">
                            {item.title}
                          </p>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            {item.description}
                          </p>
                          {item.timestamp ? (
                            <p className="text-muted-foreground text-xs">
                              <LiveRelativeTime iso={item.timestamp} />
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
