import Link from 'next/link'
import { ArrowRight, Dumbbell, Moon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary } from 'app/types/database'

type WorkoutStatus = {
  label: string
  tone: 'muted' | 'active' | 'success' | 'warning'
}

type PortalTodayWorkoutHeroProps = {
  todayWorkout: CalendarDaySummary | null
  workoutStatus: WorkoutStatus | null
  streak: number
}

function statusBadgeVariant(
  tone: WorkoutStatus['tone']
): 'default' | 'secondary' | 'success' | 'warning' {
  switch (tone) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'active':
      return 'default'
    default:
      return 'secondary'
  }
}

function workoutActionLabel(status: WorkoutStatus | null) {
  if (!status) return 'View calendar'
  if (status.label === 'Completed') return 'View session'
  if (status.label === 'In progress' || status.label === 'Paused') {
    return 'Continue workout'
  }
  if (status.label === 'Skipped') return 'View session'
  return 'Start workout'
}

export function PortalTodayWorkoutHero({
  todayWorkout,
  workoutStatus,
  streak,
}: PortalTodayWorkoutHeroProps) {
  const isRestDay = !todayWorkout

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border shadow-card',
        isRestDay
          ? 'bg-card'
          : 'border-brand/20 from-brand/10 bg-gradient-to-br to-brand/5'
      )}
    >
      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="section-header text-muted-foreground">Today&apos;s workout</p>
            {isRestDay ? (
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Rest day
              </h2>
            ) : (
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {todayWorkout.name}
              </h2>
            )}
          </div>
          <div
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl',
              isRestDay ? 'bg-muted text-muted-foreground' : 'bg-brand/15 text-brand'
            )}
          >
            {isRestDay ? (
              <Moon className="size-5" />
            ) : (
              <Dumbbell className="size-5" />
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          {isRestDay
            ? 'No session scheduled today. Recovery counts — check back tomorrow or browse your calendar.'
            : workoutStatus?.label === 'Completed'
              ? 'Nice work finishing today’s session.'
              : 'Your coach planned this session for today. Log sets as you go.'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {!isRestDay && workoutStatus ? (
            <Badge variant={statusBadgeVariant(workoutStatus.tone)}>
              {workoutStatus.label}
            </Badge>
          ) : null}
          {streak > 0 ? (
            <Badge variant="outline">
              {streak}-day streak
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {isRestDay ? (
            <Button variant="brand" size="sm" asChild>
              <Link href="/portal/workouts">
                View calendar
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="brand" size="sm" asChild>
              <Link href={`/portal/workouts/${todayWorkout.id}/log`}>
                {workoutActionLabel(workoutStatus)}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
          {!isRestDay ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/portal/workouts?date=${todayWorkout.scheduled_date}`}>
                Session details
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
