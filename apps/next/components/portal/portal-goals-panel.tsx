'use client'

import * as React from 'react'
import { Dumbbell, Flag, Repeat, Scale } from 'lucide-react'

import { DailyTargetsCard } from '@/components/goals/daily-targets-card'
import { GoalProgressCard } from '@/components/goals/goal-progress-card'
import { HabitGoalCard } from '@/components/goals/habit-goal-card'
import { MilestoneGoalCard } from '@/components/goals/milestone-goal-card'
import { PerformanceGoalCard } from '@/components/goals/performance-goal-card'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FilterPills } from '@/components/ui/filter-pills'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { ClientGoal } from 'app/types/database'

type GoalCategory =
  | 'all'
  | 'daily'
  | 'composition'
  | 'performance'
  | 'habit'
  | 'milestone'

type PortalGoalsPanelProps = {
  dailyGoals: ClientGoal[]
  compositionGoals: ClientGoal[]
  performanceGoals: ClientGoal[]
  habitGoals: ClientGoal[]
  milestoneGoals: ClientGoal[]
  progressContext: GoalProgressContext
}

const EMPTY_CATEGORY_PILLS = [
  { key: 'performance' as const, label: 'Performance / PRs' },
  { key: 'habit' as const, label: 'Habit tracking' },
  { key: 'milestone' as const, label: 'Milestones' },
]

function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase md:hidden">
      {children}
    </p>
  )
}

function DesktopSectionHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="hidden space-y-1 md:block">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  )
}

export function PortalGoalsPanel({
  dailyGoals,
  compositionGoals,
  performanceGoals,
  habitGoals,
  milestoneGoals,
  progressContext,
}: PortalGoalsPanelProps) {
  const [filter, setFilter] = React.useState<GoalCategory>('all')

  const emptySecondaryCategories = EMPTY_CATEGORY_PILLS.filter(({ key }) => {
    if (key === 'performance') return performanceGoals.length === 0
    if (key === 'habit') return habitGoals.length === 0
    return milestoneGoals.length === 0
  })

  function showSection(category: GoalCategory) {
    return filter === 'all' || filter === category
  }

  function handleFilterChange(value: string) {
    const next = value as GoalCategory
    setFilter(next)

    if (next === 'all') return

    window.requestAnimationFrame(() => {
      document
        .getElementById(`portal-goals-${next}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'daily', label: 'Daily targets' },
    { value: 'composition', label: 'Body comp' },
    { value: 'performance', label: 'Performance' },
    { value: 'habit', label: 'Habits' },
    { value: 'milestone', label: 'Milestones' },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <FilterPills
        value={filter}
        onChange={handleFilterChange}
        options={filterOptions}
        size="sm"
        className="md:hidden"
      />

      {showSection('daily') ? (
        <section id="portal-goals-daily" className="scroll-mt-4">
          <div className="md:hidden">
            <DailyTargetsCard
              goals={dailyGoals}
              checkIns={progressContext.checkIns}
              compact
            />
          </div>
          <div className="hidden md:block">
            <DailyTargetsCard
              goals={dailyGoals}
              checkIns={progressContext.checkIns}
            />
          </div>
        </section>
      ) : null}

      {showSection('composition') ? (
        <section id="portal-goals-composition" className="grid scroll-mt-4 gap-4">
          <DesktopSectionHeader
            title="Body composition goals"
            description="Progress is measured from InBody scans or check-in weight when configured."
          />
          <MobileSectionLabel>Body composition</MobileSectionLabel>
          {compositionGoals.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Scale}
                  title="No body composition goals yet"
                  description="Your coach can set weight, body fat, or muscle targets measured from InBody scans."
                  className="py-4"
                />
              </CardContent>
            </Card>
          ) : (
            compositionGoals.map((goal) => (
              <GoalProgressCard
                key={goal.id}
                goal={goal}
                context={progressContext}
                presentation="portal"
              />
            ))
          )}
        </section>
      ) : null}

      {showSection('performance') &&
      (performanceGoals.length > 0 || filter === 'performance') ? (
        <section id="portal-goals-performance" className="grid scroll-mt-4 gap-4">
          <DesktopSectionHeader
            title="Performance goals"
            description="Progress updates automatically from your workout PRs."
          />
          {performanceGoals.length > 0 ? (
            <>
              <MobileSectionLabel>Performance</MobileSectionLabel>
              {performanceGoals.map((goal) => (
                <PerformanceGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                  presentation="portal"
                />
              ))}
            </>
          ) : (
            <Card className="md:hidden">
              <CardContent className="text-muted-foreground py-6 text-center text-sm leading-relaxed">
                No performance goals yet. Ask your coach to set lift targets or
                PR goals.
              </CardContent>
            </Card>
          )}
          {performanceGoals.length === 0 ? (
            <div className="hidden md:block">
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Dumbbell}
                    title="No performance goals yet"
                    description="Your coach can set lift targets and PR goals that update as you log workouts."
                    className="py-4"
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      ) : null}

      {showSection('habit') && (habitGoals.length > 0 || filter === 'habit') ? (
        <section id="portal-goals-habit" className="grid scroll-mt-4 gap-4">
          <DesktopSectionHeader
            title="Habit goals"
            description="Weekly consistency tracked from workouts and check-ins."
          />
          {habitGoals.length > 0 ? (
            <>
              <MobileSectionLabel>Habits</MobileSectionLabel>
              {habitGoals.map((goal) => (
                <HabitGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                  presentation="portal"
                />
              ))}
            </>
          ) : (
            <Card className="md:hidden">
              <CardContent className="text-muted-foreground py-6 text-center text-sm leading-relaxed">
                No habit goals yet. Your coach can track weekly consistency
                here.
              </CardContent>
            </Card>
          )}
          {habitGoals.length === 0 ? (
            <div className="hidden md:block">
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Repeat}
                    title="No habit goals yet"
                    description="Your coach can track weekly consistency like training frequency or check-ins."
                    className="py-4"
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      ) : null}

      {showSection('milestone') &&
      (milestoneGoals.length > 0 || filter === 'milestone') ? (
        <section id="portal-goals-milestone" className="grid scroll-mt-4 gap-4">
          <DesktopSectionHeader
            title="Milestone goals"
            description="Long-term milestones like session counts and training streaks."
          />
          {milestoneGoals.length > 0 ? (
            <>
              <MobileSectionLabel>Milestones</MobileSectionLabel>
              {milestoneGoals.map((goal) => (
                <MilestoneGoalCard
                  key={goal.id}
                  goal={goal}
                  context={progressContext}
                  presentation="portal"
                />
              ))}
            </>
          ) : (
            <Card className="md:hidden">
              <CardContent className="text-muted-foreground py-6 text-center text-sm leading-relaxed">
                No milestone goals yet. Your coach can set long-term milestones
                like session counts or streaks.
              </CardContent>
            </Card>
          )}
          {milestoneGoals.length === 0 ? (
            <div className="hidden md:block">
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Flag}
                    title="No milestone goals yet"
                    description="Your coach can set long-term milestones like total sessions or training streaks."
                    className="py-4"
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      ) : null}

      {filter === 'all' && emptySecondaryCategories.length > 0 ? (
        <Card className="md:hidden">
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-medium">
              More goals can be added by your coach
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Ask your coach to set goals in any of these categories:
            </p>
            <div className="flex flex-wrap gap-2">
              {emptySecondaryCategories.map((category) => (
                <span
                  key={category.key}
                  className="border-border bg-muted/40 text-muted-foreground inline-flex rounded-full border px-3 py-1 text-xs font-medium"
                >
                  {category.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
