'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  Circle,
  ClipboardList,
  ClipboardPen,
  Dumbbell,
  Moon,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'

import { setClientOnboardingMilestone } from '@/app/(dashboard)/clients/actions'
import { ClientAssessmentNotesPanel } from '@/components/clients/client-assessment-notes-panel'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { MobileKeyboardReserve } from '@/components/mobile-keyboard/mobile-keyboard'
import { cn } from '@/lib/utils'
import {
  getCheckInDueStepLabel,
  getIncludedOnboardingMilestones,
  isOnboardingMilestoneIncluded,
  type ClientOnboardingMilestoneKey,
  type ClientOnboardingMilestoneTemplate,
  type ClientOnboardingProgress,
} from '@/lib/client-onboarding'
import type { CheckInFrequency } from 'app/types/database'

type ClientOnboardingChecklistProps = {
  clientId: string
  clientName: string
  progress: ClientOnboardingProgress
  includedMilestones?: ClientOnboardingMilestoneTemplate
  initialAssessmentNotes: string | null
  programName?: string | null
  checkInFrequency: CheckInFrequency
  onOpenPrograms?: () => void
  onOpenCheckIns?: () => void
  onOpenCalendar?: () => void
}

const milestoneSteps: Array<{
  key: Exclude<keyof ClientOnboardingProgress, 'assessmentNotesRecorded'>
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

const assessmentStep = {
  key: 'assessmentNotesRecorded' as const,
  title: 'Assessment notes',
  description: 'Record movement scores, notes, and media from the initial assessment.',
  icon: ClipboardPen,
}

function MilestoneToggle({
  done,
  label,
  disabled,
  onToggle,
}: {
  done: boolean
  label: string
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={done ? `Mark ${label} incomplete` : `Mark ${label} complete`}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full transition',
        done
          ? 'bg-brand text-brand-foreground hover:bg-brand/90'
          : 'bg-muted text-muted-foreground hover:bg-muted/80',
        disabled && 'pointer-events-none opacity-60'
      )}
    >
      {done ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Circle className="size-4" aria-hidden />
      )}
    </button>
  )
}

export function ClientOnboardingChecklist({
  clientId,
  clientName,
  progress,
  includedMilestones,
  initialAssessmentNotes,
  programName,
  checkInFrequency,
  onOpenPrograms,
  onOpenCheckIns,
  onOpenCalendar,
}: ClientOnboardingChecklistProps) {
  const router = useRouter()
  const [localProgress, setLocalProgress] = React.useState(progress)
  const [pendingMilestone, setPendingMilestone] =
    React.useState<ClientOnboardingMilestoneKey | null>(null)
  const [assessmentOpen, setAssessmentOpen] = React.useState(false)

  const visibleMilestoneSteps = milestoneSteps.filter((step) =>
    isOnboardingMilestoneIncluded(includedMilestones, step.key)
  )
  const showAssessmentStep = isOnboardingMilestoneIncluded(
    includedMilestones,
    assessmentStep.key
  )
  const includedKeys = getIncludedOnboardingMilestones(includedMilestones)
  const totalSteps = includedKeys.length
  const completedCount = includedKeys.filter((key) => localProgress[key]).length

  React.useEffect(() => {
    setLocalProgress(progress)
  }, [progress])

  function getStepLabel(
    stepKey: Exclude<keyof ClientOnboardingProgress, 'assessmentNotesRecorded'>
  ) {
    if (stepKey === 'programAssigned' && localProgress.programAssigned && programName) {
      return `Program assigned: ${programName}`
    }

    if (stepKey === 'firstCheckInDue') {
      return getCheckInDueStepLabel(
        checkInFrequency,
        localProgress.firstCheckInDue
      )
    }

    return milestoneSteps.find((step) => step.key === stepKey)?.title ?? ''
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

  async function handleToggleMilestone(
    milestone: ClientOnboardingMilestoneKey,
    currentlyDone: boolean
  ) {
    const nextDone = !currentlyDone
    setPendingMilestone(milestone)
    setLocalProgress((current) => ({
      ...current,
      [milestone]: nextDone,
    }))

    const result = await setClientOnboardingMilestone(
      clientId,
      milestone,
      nextDone
    )
    setPendingMilestone(null)

    if (result.success) {
      router.refresh()
    } else {
      setLocalProgress(progress)
      toast.error(result.error)
    }
  }

  const AssessmentIcon = assessmentStep.icon
  const assessmentDone = localProgress.assessmentNotesRecorded
  const hasLegacyNotes = Boolean(initialAssessmentNotes?.trim())

  return (
    <>
      <Card className="border-brand/20 bg-brand/5 gap-0 py-0">
        <CardHeader className="border-brand/10 flex flex-row items-start justify-between gap-4 space-y-0 border-b px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="bg-brand/10 text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">Client onboarding</CardTitle>
              <CardDescription>
                {completedCount} of {totalSteps} milestones for {clientName}. Tap a
                checkmark to mark complete or incomplete.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 py-4 sm:px-6">
          {visibleMilestoneSteps.map((step) => {
            const done = localProgress[step.key]
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
                  <MilestoneToggle
                    done={done}
                    label={getStepLabel(step.key)}
                    disabled={pendingMilestone === step.key}
                    onToggle={() => void handleToggleMilestone(step.key, done)}
                  />
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

          {showAssessmentStep ? (
            <div
              className={cn(
                'flex flex-col gap-3 rounded-xl border bg-background/80 p-4 sm:flex-row sm:items-center',
                assessmentDone && 'border-brand/20 bg-brand/5'
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <MilestoneToggle
                  done={assessmentDone}
                  label={assessmentStep.title}
                  disabled={pendingMilestone === assessmentStep.key}
                  onToggle={() =>
                    void handleToggleMilestone(assessmentStep.key, assessmentDone)
                  }
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <AssessmentIcon className="text-muted-foreground size-4 shrink-0" />
                    <p className="text-sm font-semibold">{assessmentStep.title}</p>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {assessmentStep.description}
                    {hasLegacyNotes && !assessmentDone
                      ? ' Legacy notes are available in the assessment history.'
                      : ''}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setAssessmentOpen(true)}
              >
                {assessmentDone ? 'View assessments' : 'Record assessment'}
              </Button>
            </div>
          ) : null}

          <p className="text-muted-foreground text-xs leading-relaxed">
            Configure checklist steps, auto-assign, and welcome messages in{' '}
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

      <Sheet open={assessmentOpen} onOpenChange={setAssessmentOpen}>
        <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <SheetHeader className="shrink-0 border-b">
            <SheetTitle>Assessment notes</SheetTitle>
            <SheetDescription>
              Movement scores, notes, and media for {clientName}.
            </SheetDescription>
          </SheetHeader>
          <div
            data-nested-keyboard-scroll
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4"
          >
            <ClientAssessmentNotesPanel
              clientId={clientId}
              clientName={clientName}
              initialNotes={initialAssessmentNotes}
              autoStartNew={!assessmentDone}
              onCancel={() => {
                setAssessmentOpen(false)
                router.refresh()
              }}
            />
            <MobileKeyboardReserve />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
