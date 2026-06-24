'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarPlus,
  Check,
  Circle,
  ClipboardList,
  Sparkles,
  UserPlus,
  X,
} from 'lucide-react'

import { AddClientDialog } from '@/components/clients/add-client-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CoachGettingStartedProgress } from '@/lib/coach-onboarding'
import { isGettingStartedComplete } from '@/lib/coach-onboarding'

const DISMISS_KEY = (userId: string) =>
  `coach-getting-started-dismissed:${userId}`

type CoachGettingStartedChecklistProps = {
  userId: string
  progress: CoachGettingStartedProgress
  gyms?: { id: string; name: string }[]
}

const steps = [
  {
    key: 'client' as const,
    title: 'Add your first client',
    description: 'Create a client profile and send them an invite to the portal.',
    href: '/clients',
    actionLabel: 'Go to clients',
    icon: UserPlus,
    isComplete: (progress: CoachGettingStartedProgress) => progress.hasClient,
  },
  {
    key: 'program' as const,
    title: 'Build a program',
    description: 'Create a multi-week program or a reusable workout template.',
    href: '/library/programs',
    actionLabel: 'Open library',
    icon: ClipboardList,
    isComplete: (progress: CoachGettingStartedProgress) =>
      progress.hasProgramOrWorkout,
  },
  {
    key: 'schedule' as const,
    title: 'Assign to a calendar',
    description: 'Assign a program or schedule a session on a client calendar.',
    href: '/clients',
    actionLabel: 'Schedule a session',
    icon: CalendarPlus,
    isComplete: (progress: CoachGettingStartedProgress) =>
      progress.hasScheduledWorkout,
  },
]

export function CoachGettingStartedChecklist({
  userId,
  progress,
  gyms = [],
}: CoachGettingStartedChecklistProps) {
  const [dismissed, setDismissed] = React.useState(false)
  const complete = isGettingStartedComplete(progress)
  const completedCount = steps.filter((step) => step.isComplete(progress)).length

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY(userId)) === '1')
    } catch {
      setDismissed(false)
    }
  }, [userId])

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY(userId), '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  if (dismissed || complete) {
    return null
  }

  return (
    <Card className="border-brand/20 bg-brand/5 gap-0 py-0">
      <CardHeader className="border-brand/10 flex flex-row items-start justify-between gap-4 space-y-0 border-b px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="bg-brand/10 text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Getting started</CardTitle>
            <CardDescription>
              {completedCount} of {steps.length} steps complete — finish setup to
              start coaching.
            </CardDescription>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8 shrink-0"
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4 sm:px-6">
        {steps.map((step) => {
          const done = step.isComplete(progress)
          const Icon = step.icon

          return (
            <div
              key={step.key}
              className={cn(
                'flex flex-col gap-3 rounded-xl border bg-background/80 p-4 sm:flex-row sm:items-center',
                done && 'border-brand/20 bg-brand/5'
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                    done
                      ? 'bg-brand text-brand-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <Circle className="size-4" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    <p className="text-sm font-semibold">{step.title}</p>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
              {!done ? (
                step.key === 'client' ? (
                  <AddClientDialog
                    gyms={gyms}
                    trigger={
                      <Button type="button" variant="brand" size="sm">
                        Add client
                      </Button>
                    }
                  />
                ) : (
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link href={step.href}>{step.actionLabel}</Link>
                  </Button>
                )
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
