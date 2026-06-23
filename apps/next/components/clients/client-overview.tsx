'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Minus,
  Moon,
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
import { CheckInTrendsChart, CheckInTrendsSummary } from '@/components/check-ins/check-in-trends-chart'
import { TrainingConsistencyHeatmap } from '@/components/training/training-consistency-heatmap'
import {
  buildClientActivityItems,
  calcClientCompletionRate,
  calcWorkoutStreak,
  getBlendedReadinessLevel,
  getDaysSinceLastSession,
  getLastActiveLabel,
  hasFlaggedNotes,
  isClientSetupComplete,
  type ClientWorkoutActivity,
} from '@/lib/client-metrics'
import { buildCheckInTrendPoints } from '@/lib/check-in-trends'
import { formatVolume } from '@/lib/coach-preferences'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { RecentPrHighlight } from '@/lib/pr-records'
import type { TrainingConsistencyHeatmap as TrainingConsistencyHeatmapData } from '@/lib/training-consistency'
import {
  formatRelativeUpdated,
  getPreSessionInsight,
  getSessionReadinessInsight,
} from '@/lib/client-overview'
import { InlineEditableField } from '@/components/clients/inline-editable-field'
import { LiveRelativeTime } from '@/components/ui/live-relative-time'
import { getWeekDayLabels } from '@/lib/calendar'
import {
  getCompletionRateStatusLevel,
  getWorkoutActivityIconClass,
  statusTextClass,
  type WorkoutActivityStatus,
} from '@/lib/status-colors'
import { cn } from '@/lib/utils'
import type {
  CalendarDaySummary,
  Client,
  ClientCheckIn,
  ClientProgramAssignment,
  ClientScheduledWorkout,
} from 'app/types/database'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="section-header">{children}</p>
}

function StatCard({
  label,
  value,
  hint,
  accent,
  valueTone = accent ? 'brand' : 'default',
}: {
  label: string
  value: string
  hint: string
  accent?: boolean
  valueTone?: 'brand' | 'warning' | 'success' | 'default'
}) {
  const valueClass =
    valueTone === 'brand'
      ? 'text-brand'
      : valueTone === 'warning'
        ? statusTextClass.warning
        : valueTone === 'success'
          ? statusTextClass.success
          : undefined

  return (
    <Card className={cn('gap-0 py-0', accent && 'border-brand/15 from-brand/5 bg-gradient-to-br to-transparent')}>
      <CardContent className="space-y-0.5 px-3 py-3 sm:space-y-1 sm:px-5 sm:py-5">
        <p className="section-header text-muted-foreground text-[10px] sm:text-xs">{label}</p>
        <p className={cn('text-2xl font-semibold tracking-tight sm:text-3xl', valueClass)}>
          {value}
        </p>
        <p className="helper-text line-clamp-2 text-[11px] leading-snug sm:line-clamp-none sm:text-sm">
          {hint}
        </p>
      </CardContent>
    </Card>
  )
}

function OverviewSectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 pb-0">
        <SectionLabel>{title}</SectionLabel>
        {action}
      </CardHeader>
      <CardContent className="px-4 pb-4">{children}</CardContent>
    </Card>
  )
}

function metricValueTone(
  variant: string
): 'warning' | 'success' | 'danger' | 'default' {
  if (variant === 'danger') return 'danger'
  if (variant === 'warning') return 'warning'
  if (variant === 'success') return 'success'
  return 'default'
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
      <span className="text-muted-foreground body-text shrink-0">{label}</span>
      <span
        className={cn(
          'body-text text-right',
          emphasize && 'font-medium',
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
          'body-text leading-snug',
          muted ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        {label}
      </span>
    </div>
  )
}

function MetricRow({
  label,
  value,
  valueTone = 'default',
}: {
  label: string
  value: string
  valueTone?: 'warning' | 'success' | 'danger' | 'default'
}) {
  const valueClass =
    valueTone === 'warning'
      ? statusTextClass.warning
      : valueTone === 'danger'
        ? statusTextClass.danger
        : valueTone === 'success'
          ? statusTextClass.success
          : undefined

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-muted-foreground body-text">{label}</span>
      <span className={cn('body-text font-medium', valueClass)}>{value}</span>
    </div>
  )
}

const activityIcons = {
  completed: CheckCircle2,
  in_progress: PlayCircle,
  skipped: SkipForward,
  scheduled: Zap,
} as const

type ClientOverviewProps = {
  client: Client
  activeAssignment?: ClientProgramAssignment | null
  weekSessions?: CalendarDaySummary[]
  recentWorkouts?: ClientWorkoutActivity[]
  streakWorkouts?: ClientWorkoutActivity[]
  checkIns?: ClientCheckIn[]
  loadMetrics?: {
    thisWeekVolume: number
    volumeDeltaLabel: string
    acwrLabel: string
    acwrVariant: 'success' | 'warning' | 'secondary'
  }
  recentPrs?: RecentPrHighlight[]
  trainingConsistency?: TrainingConsistencyHeatmapData | null
  weekStartsOn?: CoachPreferences['weekStartsOn']
  weightUnit?: CoachPreferences['weightUnit']
  onOpenCalendar?: () => void
  onOpenCheckIns?: () => void
  onOpenPrograms?: () => void
}

export function ClientOverview({
  client,
  activeAssignment = null,
  weekSessions = [],
  recentWorkouts = [],
  streakWorkouts = [],
  checkIns = [],
  loadMetrics,
  recentPrs = [],
  trainingConsistency = null,
  weekStartsOn = 'monday',
  weightUnit = 'lbs',
  onOpenCalendar,
  onOpenCheckIns,
  onOpenPrograms,
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
  const preSessionInsight = getPreSessionInsight(
    client,
    hasProgram,
    hasScheduledWorkouts
  )

  const completionRate = calcClientCompletionRate(weekSessions)
  const completionStatus = getCompletionRateStatusLevel(
    completionRate,
    weekSessions.length
  )
  const completionValueTone =
    completionStatus === 'warning'
      ? 'warning'
      : completionStatus === 'success'
        ? 'success'
        : 'brand'
  const streak = calcWorkoutStreak(streakWorkouts)
  const lastActive = getLastActiveLabel(recentWorkouts)
  const latestCheckIn = checkIns[0] ?? null
  const readiness = getBlendedReadinessLevel(recentWorkouts, latestCheckIn)
  const insight = setupComplete
    ? getSessionReadinessInsight(readiness)
    : preSessionInsight
  const checkInTrendPoints = buildCheckInTrendPoints(checkIns)
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

  const lastWorkoutLabel = lastWorkout
    ? `${lastWorkout.name} · ${new Date(lastWorkout.completed_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'None yet'
  const readinessTone = metricValueTone(readiness.variant)
  const checkInFlagsValue =
    readiness.flags.length > 0 ? readiness.flags.join(', ') : '—'

  const viewAllCheckInsAction = onOpenCheckIns ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground h-8 gap-1 px-2 text-xs"
      onClick={onOpenCheckIns}
    >
      View all
      <ArrowRight className="size-3.5" />
    </Button>
  ) : null

  const openCalendarAction = onOpenCalendar ? (
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
  ) : null

  function renderWeekStrip() {
    return (
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {weekDays.map(({ label, dateKey, isToday }) => {
          const session = sessionsByDate.get(dateKey)
          const boxClassName = cn(
            'flex size-9 flex-col items-center justify-center rounded-lg border transition-colors sm:size-11',
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
            <Minus className="size-3.5 sm:size-4" strokeWidth={2.5} />
          )

          return (
            <div key={dateKey} className="flex flex-col items-center gap-1.5 sm:gap-2">
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
                  'text-[11px] font-medium sm:text-xs',
                  isToday ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Completion rate"
            value={completionRate !== null ? `${completionRate}%` : '—'}
            hint={
              weekSessions.length > 0
                ? `${weekSessions.length} session${weekSessions.length === 1 ? '' : 's'} this week`
                : 'No sessions this week'
            }
            accent
            valueTone={completionValueTone}
          />
          <StatCard
            label="This week volume"
            value={
              loadMetrics ? formatVolume(loadMetrics.thisWeekVolume, weightUnit) : '—'
            }
            hint={loadMetrics?.volumeDeltaLabel ?? 'Log workouts to track load'}
          />
          <StatCard
            label="Current streak"
            value={streak > 0 ? `${streak} day${streak === 1 ? '' : 's'}` : '—'}
            hint={streak > 0 ? 'Consecutive workout days' : 'No workouts yet'}
          />
          <StatCard
            label="Last active"
            value={lastActive}
            hint="Most recent session"
          />
        </div>

        <OverviewSectionCard
          title={setupComplete ? 'Session readiness' : 'Pre-session snapshot'}
          action={<Badge variant={insight.variant}>{insight.badge}</Badge>}
        >
          {setupComplete ? (
            <div className="divide-y">
              <MetricRow
                label="Readiness"
                value={readiness.label}
                valueTone={readinessTone}
              />
              <MetricRow
                label="Check-in flags"
                value={checkInFlagsValue}
                valueTone={readiness.flags.length > 0 ? 'warning' : 'default'}
              />
              <MetricRow label="Last workout" value={lastWorkoutLabel} />
            </div>
          ) : (
            <div className="space-y-1">
              <p className="helper-text mb-2 leading-relaxed">{insight.message}</p>
              <ChecklistRow
                done={hasGoal}
                label={hasGoal ? `Goal set: ${client.goal!.trim()}` : 'Add a goal'}
              />
              <ChecklistRow
                done={hasProgram}
                label={
                  hasProgram
                    ? `Program: ${activeAssignment!.program.name}`
                    : 'Assign a program'
                }
              />
              <ChecklistRow
                done={hasScheduledWorkouts}
                label={
                  hasScheduledWorkouts
                    ? `${weekSessions.length} workout${weekSessions.length === 1 ? '' : 's'} this week`
                    : 'Schedule workouts'
                }
              />
            </div>
          )}
        </OverviewSectionCard>

        {checkInTrendPoints.length > 0 && (
          <OverviewSectionCard
            title="Check-in trends"
            action={viewAllCheckInsAction}
          >
            <CheckInTrendsSummary points={checkInTrendPoints} />
          </OverviewSectionCard>
        )}

        {recentPrs.length > 0 && (
          <OverviewSectionCard title="Recent PRs">
            <ul className="divide-y">
              {recentPrs.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Flame className="size-4 shrink-0 text-amber-500" />
                    <span className="truncate font-medium">{item.exerciseName}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </OverviewSectionCard>
        )}

        <OverviewSectionCard title="This week" action={openCalendarAction}>
          {renderWeekStrip()}
        </OverviewSectionCard>
      </div>

      <div className="hidden space-y-4 md:block">
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
          valueTone={completionValueTone}
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

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <Card className="gap-0 py-0">
          <CardHeader className="px-5 pt-5 pb-0">
            <SectionLabel>Client profile</SectionLabel>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="flex items-baseline justify-between gap-4 border-b py-3">
              <span className="text-muted-foreground body-text shrink-0">
                Primary goal
              </span>
              <InlineEditableField
                clientId={client.id}
                field="goal"
                value={client.goal ?? ''}
                placeholder="Add a goal"
                emphasize={hasGoal}
              />
            </div>
            <DetailRow label="Email" value={client.email?.trim() || '—'} />
            <div className="flex items-baseline justify-between gap-4 border-b py-3">
              <span className="text-muted-foreground body-text shrink-0">
                Phone
              </span>
              <InlineEditableField
                clientId={client.id}
                field="phone"
                value={client.phone ?? ''}
                placeholder="Add phone"
              />
            </div>
            <div className="flex items-baseline justify-between gap-4 border-b py-3">
              <span className="text-muted-foreground body-text shrink-0">
                Current program
              </span>
              {onOpenPrograms ? (
                <button
                  type="button"
                  onClick={onOpenPrograms}
                  className={cn(
                    'body-text hover:text-brand text-right transition-colors focus-visible:text-brand focus-visible:outline-none',
                    activeAssignment && 'font-medium'
                  )}
                >
                  {activeAssignment?.program.name ?? 'Not assigned yet'}
                </button>
              ) : (
                <span
                  className={cn(
                    'body-text text-right',
                    activeAssignment && 'font-medium',
                    !activeAssignment && 'text-muted-foreground'
                  )}
                >
                  {activeAssignment?.program.name ?? 'Not assigned yet'}
                </span>
              )}
            </div>
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
                <p className="helper-text leading-relaxed">{insight.message}</p>
                <div className="border-t pt-2">
                  <MetricRow
                    label="Last workout logged"
                    value={lastWorkoutLabel}
                  />
                  <MetricRow
                    label="Readiness"
                    value={readiness.label}
                    valueTone={readinessTone}
                  />
                  {readiness.flags.length > 0 && (
                    <MetricRow
                      label="Check-in flags"
                      value={readiness.flags.join(', ')}
                      valueTone="warning"
                    />
                  )}
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
                <p className="helper-text leading-relaxed">{insight.message}</p>
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
            <p className="helper-text">
              {formatRelativeUpdated(client.updated_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {checkInTrendPoints.length > 0 && (
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
            <div className="flex items-center gap-2">
              <Moon className="text-brand size-4" />
              <SectionLabel>Check-in trends</SectionLabel>
            </div>
            {onOpenCheckIns && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 gap-1 px-2 text-xs"
                onClick={onOpenCheckIns}
              >
                View check-ins
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <CheckInTrendsChart points={checkInTrendPoints} />
          </CardContent>
        </Card>
      )}

      {trainingConsistency && (
        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
            <div className="flex items-center gap-2">
              <Zap className="text-brand size-4" />
              <SectionLabel>Training consistency</SectionLabel>
            </div>
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
            <TrainingConsistencyHeatmap
              heatmap={trainingConsistency}
              weekStartsOn={weekStartsOn}
            />
          </CardContent>
        </Card>
      )}

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

      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
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
            {renderWeekStrip()}
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
                  const status = item.status as WorkoutActivityStatus
                  const Icon = activityIcons[status] ?? activityIcons.scheduled
                  const iconClassName = getWorkoutActivityIconClass(status)
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
                          iconClassName
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
                          <LiveRelativeTime iso={item.timestamp} />
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
    </>
  )
}
