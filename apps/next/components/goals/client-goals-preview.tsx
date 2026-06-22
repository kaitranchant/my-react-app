'use client'

import * as React from 'react'
import { ArrowRight, ChevronDown, Eye } from 'lucide-react'

import { DailyTargetsCard } from '@/components/goals/daily-targets-card'
import { GoalProgressCard } from '@/components/goals/goal-progress-card'
import { HabitGoalCard } from '@/components/goals/habit-goal-card'
import { MilestoneGoalCard } from '@/components/goals/milestone-goal-card'
import { PerformanceGoalCard } from '@/components/goals/performance-goal-card'
import { partitionClientGoals } from '@/lib/goal-progress'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { ClientGoal } from 'app/types/database'
import { cn } from '@/lib/utils'

type ClientGoalsPreviewProps = {
  clientFirstName: string
  goals: ClientGoal[]
  progressContext: GoalProgressContext
  coachPreferences?: Pick<CoachPreferences, 'weekStartsOn' | 'timezone'>
}

export function ClientGoalsPreview({
  clientFirstName,
  goals,
  progressContext,
  coachPreferences,
}: ClientGoalsPreviewProps) {
  const [open, setOpen] = React.useState(false)
  const {
    dailyGoals,
    compositionGoals,
    performanceGoals,
    habitGoals,
    milestoneGoals,
  } = partitionClientGoals(goals)

  const hasPreviewContent =
    dailyGoals.length > 0 ||
    performanceGoals.length > 0 ||
    habitGoals.length > 0 ||
    milestoneGoals.length > 0 ||
    compositionGoals.length > 0

  if (!hasPreviewContent) return null

  return (
    <section className="overflow-hidden rounded-xl border bg-muted/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="text-muted-foreground size-4 shrink-0" />
          <span className="text-base font-semibold tracking-tight">
            Client preview
          </span>
        </div>
        <span className="text-brand flex shrink-0 items-center gap-1 text-sm font-medium">
          {open ? (
            <>
              Hide
              <ChevronDown className="size-4" />
            </>
          ) : (
            <>
              <span className="hidden sm:inline">
                Show how {clientFirstName} sees this
              </span>
              <span className="sm:hidden">Preview</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </span>
      </button>

      <div
        className={cn(
          'grid gap-4 border-t px-4 pb-4',
          open ? 'pt-4' : 'hidden'
        )}
      >
        <p className="text-muted-foreground text-sm leading-relaxed">
          This is how {clientFirstName} will see their goals in the portal.
        </p>

        <DailyTargetsCard
          goals={dailyGoals}
          checkIns={progressContext.checkIns}
          description="Daily reminders from you."
        />

        {performanceGoals.length > 0 ? (
          <section className="grid gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight">
                Performance goals
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Progress updates automatically from workout PRs.
              </p>
            </div>
            {performanceGoals.map((goal) => (
              <PerformanceGoalCard
                key={goal.id}
                goal={goal}
                context={progressContext}
              />
            ))}
          </section>
        ) : null}

        {habitGoals.length > 0 ? (
          <section className="grid gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight">
                Habit goals
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Weekly consistency tracked from workouts and check-ins.
              </p>
            </div>
            {habitGoals.map((goal) => (
              <HabitGoalCard
                key={goal.id}
                goal={goal}
                context={progressContext}
                coachPreferences={coachPreferences}
              />
            ))}
          </section>
        ) : null}

        {milestoneGoals.length > 0 ? (
          <section className="grid gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight">
                Milestone goals
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Long-term milestones like session counts and training streaks.
              </p>
            </div>
            {milestoneGoals.map((goal) => (
              <MilestoneGoalCard
                key={goal.id}
                goal={goal}
                context={progressContext}
              />
            ))}
          </section>
        ) : null}

        {compositionGoals.length > 0 ? (
          <section className="grid gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight">
                Body composition goals
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Progress is measured from InBody scans or check-in weight when
                configured.
              </p>
            </div>
            {compositionGoals.map((goal) => (
              <GoalProgressCard
                key={goal.id}
                goal={goal}
                context={progressContext}
                coachPreferences={coachPreferences}
              />
            ))}
          </section>
        ) : null}
      </div>
    </section>
  )
}
