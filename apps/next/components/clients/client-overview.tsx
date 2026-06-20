'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Minus,
  PlayCircle,
  SkipForward,
  TrendingUp,
  Zap,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import {
  buildClientActivityItems,
  calcClientCompletionRate,
  calcWorkoutStreak,
  getDaysSinceLastSession,
  getLastActiveLabel,
  getReadinessLevel,
  hasFlaggedNotes,
  isClientSetupComplete,
  type ClientWorkoutActivity,
} from '@/lib/client-metrics'
import { formatVolume } from '@/lib/coach-preferences'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { RecentPrHighlight } from '@/lib/pr-records'
import {
  formatRelativeUpdated,
  getPreSessionInsight,
} from '@/lib/client-overview'
import { formatRelativeTime } from '@/lib/dashboard'
import { getWeekDayLabels } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type {
  CalendarDaySummary,
  Client,
  ClientProgramAssignment,
  ClientScheduledWorkout,
} from 'app/types/database'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-label">{children}</p>
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
}) {
  return (
    <Card className={cn('gap-0 py-0', accent && 'border-brand/15 from-brand/5 bg-gradient-to-br to-transparent')}>
      <CardContent className="space-y-1 px-5 py-5">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className={cn('text-3xl font-semibold tracking-tight', accent && 'text-brand')}>
          {value}
        </p>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  )
}

function DetailRow({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span
        className={cn(
          'text-right text-sm',
          emphasize && 'font-semibold',
          value === '—' && 'text-muted-foreground'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function ChecklistRow({
  done,
  label,
  muted,
}: {
  done: boolean
  label: string
  muted?: boolean
}) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <span
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          done
            ? 'bg-emerald-600 text-white'
            : 'border-muted-foreground/40 text-muted-foreground border'
        )}
      >
        {done ? '✓' : ''}
      </span>
      <span
        className={cn(
          'text-sm leading-snug',
          muted ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        {label}
      </span>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

const activityIcons = {
  completed: { icon: CheckCircle2, className: 'text-brand bg-brand/10' },
  in_progress: { icon: PlayCircle, className: 'text-amber-600 bg-amber-50' },
  skipped: { icon: SkipForward, className: 'text-muted-foreground bg-muted' },
  scheduled: { icon: Zap, className: 'text-muted-foreground bg-muted' },
} as const

type ClientOverviewProps = {
  client: Client
  activeAssignment?: ClientProgramAssignment | null
  weekSessions?: CalendarDaySummary[]
  recentWorkouts?: ClientWorkoutActivity[]
  streakWorkouts?: ClientWorkoutActivity[]
  loadMetrics?: {
    thisWeekVolume: number
    volumeDeltaLabel: string
    acwrLabel: string
    acwrVariant: 'success' | 'warning' | 'secondary'
  }
  recentPrs?: RecentPrHighlight[]
  weekStartsOn?: CoachPreferences['weekStartsOn']
  weightUnit?: CoachPreferences['weightUnit']
  onOpenCalendar?: () => void
}

export function ClientOverview({
  client,
  activeAssignment = null,
  weekSessions = [],
  recentWorkouts = [],
  streakWorkouts = [],
  loadMetrics,
  recentPrs = [],
  weekStartsOn = 'monday',
  weightUnit = 'lbs',
  onOpenCalendar,
}: ClientOverviewProps) {
  const weekDays = getWeekDayLabels(weekStartsOn)
  const sessionsByDate = new Map(
    weekSessions.map((session) => [session.scheduled_date, session])
  )
  const upcomingSession = weekSessions.find(
    (session) =>
      session.scheduled_date >= weekDays.find((day) => day.isToday)!.dateKey
  )
  const hasGoal = Boolean(client.goal?.trim())
  const hasNotes = Boolean(client.notes?.trim())
  const hasProgram = Boolean(activeAssignment)
  const hasScheduledWorkouts = weekSessions.length > 0
  const setupComplete = isClientSetupComplete(
    client,
    hasProgram,
    hasScheduledWorkouts
  )
  const insight = getPreSessionInsight(client, hasProgram, hasScheduledWorkouts)

  const completionRate = calcClientCompletionRate(weekSessions)
  const streak = calcWorkoutStreak(streakWorkouts)
  const lastActive = getLastActiveLabel(recentWorkouts)
  const readiness = getReadinessLevel(recentWorkouts)
  const daysSinceSession = getDaysSinceLastSession(recentWorkouts)
  const flaggedNotes = hasFlaggedNotes(client.notes)
  const activityItems = buildClientActivityItems(recentWorkouts)

  const lastWorkout = recentWorkouts
    .filter((w) => w.status === 'completed')
    .sort(
      (a, b) =>
        new Date(b.completed_at!).getTime() -
        new Date(a.completed_at!).getTime()
    )[0]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Completion rate"
          value={completionRate !== null ? `${completionRate}%` : '—'}
          hint={
            weekSessions.length > 0
              ? `${weekSessions.length} session${weekSessions.length === 1 ? '' : 's'} this week`
              : 'No sessions scheduled this week'
          }
          accent
        />
        <StatCard
          label="This week volume"
          value={
            loadMetrics ? formatVolume(loadMetrics.thisWeekVolume, weightUnit) : '—'
          }
          hint={loadMetrics?.volumeDeltaLabel ?? 'Log workouts to track load'}
        />
        <StatCard
          label="ACWR"
          value={loadMetrics?.acwrLabel ?? '—'}
          hint={
            loadMetrics?.acwrVariant === 'warning'
              ? 'Load spike or drop — review programming'
              : loadMetrics?.acwrVariant === 'success'
                ? 'Load ratio in optimal range'
                : 'Needs more training history'
          }
          accent={loadMetrics?.acwrVariant === 'success'}
        />
        <StatCard
          label="Current streak"
          value={streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : '—'}
          hint={
            streak > 0
              ? 'Consecutive days with completed workouts'
              : 'Complete a workout to start a streak'
          }
        />
        <StatCard
          label="Last active"
          value={lastActive}
          hint="Most recent session activity"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pt-5 pb-0">
            <SectionLabel>Client profile</SectionLabel>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <DetailRow
              label="Primary goal"
              value={client.goal?.trim() || '—'}
              emphasize={hasGoal}
            />
            <DetailRow label="Email" value={client.email?.trim() || '—'} />
            <DetailRow label="Phone" value={client.phone?.trim() || '—'} />
            <DetailRow
              label="Current program"
              value={activeAssignment?.program.name ?? 'Not assigned yet'}
              emphasize={Boolean(activeAssignment)}
            />
            <DetailRow
              label="Next session"
              value={
                upcomingSession
                  ? `${upcomingSession.name} · ${upcomingSession.scheduled_date.replace(/-/g, '/')}`
                  : 'No sessions scheduled'
              }
            />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
            <SectionLabel>
              {setupComplete ? 'Session readiness' : 'Pre-session snapshot'}
            </SectionLabel>
            <Badge variant={insight.variant}>{insight.badge}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
            {setupComplete ? (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {insight.message}
                </p>
                <div className="border-t pt-2">
                  <MetricRow
                    label="Last workout logged"
                    value={
                      lastWorkout
                        ? `${lastWorkout.name} · ${new Date(lastWorkout.completed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'None yet'
                    }
                  />
                  <MetricRow
                    label="Readiness"
                    value={readiness.label}
                  />
                  <MetricRow
                    label="Days since last session"
                    value={
                      daysSinceSession !== null
                        ? daysSinceSession === 0
                          ? 'Today'
                          : `${daysSinceSession} day${daysSinceSession === 1 ? '' : 's'}`
                        : '—'
                    }
                  />
                  {flaggedNotes && (
                    <MetricRow label="Flagged notes" value="Review coach notes" />
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {insight.message}
                </p>
                <div className="border-t pt-2">
                  <ChecklistRow
                    done={hasGoal}
                    label={
                      hasGoal
                        ? `Goal set: ${client.goal!.trim()}`
                        : 'Add a goal in Edit client'
                    }
                  />
                  <ChecklistRow
                    done={hasNotes}
                    label={
                      hasNotes
                        ? 'Coach notes on file'
                        : 'Add session notes before you meet'
                    }
                  />
                  <ChecklistRow
                    done={client.invite_status === 'accepted'}
                    label={
                      client.invite_status === 'accepted'
                        ? 'Client portal account active'
                        : 'Send account invite for self-logging'
                    }
                  />
                  <ChecklistRow
                    done={hasProgram}
                    label={
                      hasProgram
                        ? `Program assigned: ${activeAssignment!.program.name}`
                        : 'Assign a program in Training'
                    }
                  />
                  <ChecklistRow
                    done={hasScheduledWorkouts}
                    label={
                      hasScheduledWorkouts
                        ? `${weekSessions.length} workout${weekSessions.length === 1 ? '' : 's'} scheduled this week`
                        : 'Schedule workouts in Training'
                    }
                  />
                </div>
              </>
            )}
            <p className="text-muted-foreground text-xs">
              {formatRelativeUpdated(client.updated_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {recentPrs.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pt-5 pb-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-brand size-4" />
              <SectionLabel>Recent PRs</SectionLabel>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ul className="space-y-2">
              {recentPrs.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Flame className="text-amber-500 size-4 shrink-0" />
                    {item.exerciseName} · {item.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {item.date}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
            <SectionLabel>This week</SectionLabel>
            {onOpenCalendar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 gap-1 px-2 text-xs"
                onClick={onOpenCalendar}
              >
                Open calendar
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {weekDays.map(({ label, dateKey, isToday }) => {
                const session = sessionsByDate.get(dateKey)
                const boxClassName = cn(
                  'flex size-10 flex-col items-center justify-center rounded-lg border transition-colors sm:size-11',
                  isToday
                    ? 'border-brand bg-brand text-brand-foreground'
                    : session
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/60'
                      : 'border-border bg-muted/40 text-muted-foreground',
                  session && 'hover:opacity-90'
                )
                const boxContent = session ? (
                  <span className="max-w-full truncate px-0.5 text-[9px] font-semibold sm:text-[10px]">
                    {session.name.length > 8
                      ? `${session.name.slice(0, 7)}…`
                      : session.name}
                  </span>
                ) : (
                  <Minus className="size-4" strokeWidth={2.5} />
                )

                return (
                  <div key={dateKey} className="flex flex-col items-center gap-2">
                    {session ? (
                      <Link
                        href={`/clients/${client.id}?tab=training&action=log&date=${dateKey}`}
                        title={session.name}
                        aria-label={`Open ${session.name} workout log`}
                        className={boxClassName}
                      >
                        {boxContent}
                      </Link>
                    ) : (
                      <div className={boxClassName} aria-hidden>
                        {boxContent}
                      </div>
                    )}
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isToday ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              {hasScheduledWorkouts
                ? 'Click a day to open its workout log.'
                : 'No workouts scheduled this week — use Training to plan sessions.'}
            </p>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pt-5 pb-0">
            <SectionLabel>Recent activity</SectionLabel>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {activityItems.length === 0 ? (
              <p className="text-muted-foreground py-4 text-sm leading-relaxed">
                No logged sessions yet. Activity appears here when workouts are
                started or completed.
              </p>
            ) : (
              <ul>
                {activityItems.map((item, index) => {
                  const config =
                    activityIcons[item.status as keyof typeof activityIcons] ??
                    activityIcons.scheduled
                  const Icon = config.icon
                  const statusLabel: Record<
                    ClientScheduledWorkout['status'],
                    string
                  > = {
                    completed: 'completed',
                    in_progress: 'started',
                    skipped: 'skipped',
                    scheduled: 'scheduled',
                  }

                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 py-3',
                        index !== activityItems.length - 1 && 'border-b'
                      )}
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg',
                          config.className
                        )}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{item.workoutName}</span>{' '}
                          <span className="text-muted-foreground">
                            {statusLabel[item.status]}
                          </span>
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
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
      </div>

    </div>
  )
}
