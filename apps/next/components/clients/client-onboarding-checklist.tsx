'use client'

import Link from 'next/link'
import {
  Check,
  Circle,
  ClipboardList,
  Dumbbell,
  Moon,
  Sparkles,
  UserCheck,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  getCheckInDueStepLabel,
  type ClientOnboardingProgress,
} from '@/lib/client-onboarding'
import type { CheckInFrequency } from 'app/types/database'

type ClientOnboardingChecklistProps = {
  clientName: string
  progress: ClientOnboardingProgress
  programName?: string | null
  checkInFrequency: CheckInFrequency
  onOpenPrograms?: () => void
  onOpenCheckIns?: () => void
  onOpenCalendar?: () => void
}

const steps: Array<{
  key: keyof ClientOnboardingProgress
  title: string
  description: string
  icon: typeof UserCheck
  actionLabel?: string
  action?: 'programs' | 'checkIns' | 'calendar'
}> = [
  {
    key: 'inviteAccepted',
    title: 'Invite accepted',
    description: 'Client joined the portal.',
    icon: UserCheck,
  },
  {
    key: 'programAssigned',
    title: 'Assign program',
    description: 'Give them a training plan to follow.',
    icon: ClipboardList,
    actionLabel: 'Open training',
    action: 'programs',
  },
  {
    key: 'firstCheckInDue',
    title: 'First check-in due',
    description: 'Their first check-in period has arrived.',
    icon: Moon,
    actionLabel: 'View check-ins',
    action: 'checkIns',
  },
  {
    key: 'firstWorkoutLogged',
    title: 'First workout logged',
    description: 'Client completed their first session.',
    icon: Dumbbell,
    actionLabel: 'Open calendar',
    action: 'calendar',
  },
]

export function ClientOnboardingChecklist({
  clientName,
  progress,
  programName,
  checkInFrequency,
  onOpenPrograms,
  onOpenCheckIns,
  onOpenCalendar,
}: ClientOnboardingChecklistProps) {
  const completedCount = steps.filter((step) => progress[step.key]).length

  function getStepLabel(stepKey: keyof ClientOnboardingProgress) {
    if (stepKey === 'programAssigned' && progress.programAssigned && programName) {
      return `Program assigned: ${programName}`
    }

    if (stepKey === 'firstCheckInDue') {
      return getCheckInDueStepLabel(checkInFrequency, progress.firstCheckInDue)
    }

    return steps.find((step) => step.key === stepKey)?.title ?? ''
  }

  function handleAction(action?: 'programs' | 'checkIns' | 'calendar') {
    if (!action) return
    if (action === 'programs') {
      onOpenPrograms?.()
      return
    }
    if (action === 'checkIns') {
      onOpenCheckIns?.()
      return
    }
    if (action === 'calendar') {
      onOpenCalendar?.()
    }
  }

  return (
    <Card className="border-brand/20 bg-brand/5 gap-0 py-0">
      <CardHeader className="border-brand/10 flex flex-row items-start justify-between gap-4 space-y-0 border-b px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="bg-brand/10 text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Sparkles className="size-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Client onboarding</CardTitle>
            <CardDescription>
              {completedCount} of {steps.length} milestones for {clientName}.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 py-4 sm:px-6">
        {steps.map((step) => {
          const done = progress[step.key]
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
                    <p className="text-sm font-semibold">{getStepLabel(step.key)}</p>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
              {!done && step.actionLabel ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleAction(step.action)}
                >
                  {step.actionLabel}
                </Button>
              ) : null}
            </div>
          )
        })}
        <p className="text-muted-foreground text-xs leading-relaxed">
          Configure auto-assign and welcome messages in{' '}
          <Link
            href="/settings#onboarding"
            className="text-brand underline-offset-4 hover:underline"
          >
            Settings → Onboarding
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  )
}
