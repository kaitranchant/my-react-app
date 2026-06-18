'use client'

import { ArrowRight, Minus } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import {
  formatClientSince,
  formatRelativeUpdated,
  getPreSessionInsight,
  inviteStatusLabel,
  statusLabel,
} from '@/lib/client-overview'
import { getWeekDayLabels } from '@/lib/calendar'
import { cn } from '@/lib/utils'
import type {
  CalendarDaySummary,
  Client,
  ClientProgramAssignment,
} from 'app/types/database'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="section-label">
      {children}
    </p>
  )
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-1 px-5 py-5">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
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

type ClientOverviewProps = {
  client: Client
  activeAssignment?: ClientProgramAssignment | null
  weekSessions?: CalendarDaySummary[]
  onOpenNotes?: () => void
  onOpenCalendar?: () => void
}

export function ClientOverview({
  client,
  activeAssignment = null,
  weekSessions = [],
  onOpenNotes,
  onOpenCalendar,
}: ClientOverviewProps) {
  const since = formatClientSince(client.created_at)
  const account = inviteStatusLabel(client.invite_status)
  const roster = statusLabel(client.status)
  const weekDays = getWeekDayLabels()
  const sessionsByDate = new Map(
    weekSessions.map((session) => [session.scheduled_date, session])
  )
  const upcomingSession = weekSessions.find(
    (session) => session.scheduled_date >= weekDays.find((day) => day.isToday)!.dateKey
  )
  const hasGoal = Boolean(client.goal?.trim())
  const hasNotes = Boolean(client.notes?.trim())
  const hasProgram = Boolean(activeAssignment)
  const hasScheduledWorkouts = weekSessions.length > 0
  const insight = getPreSessionInsight(client, hasProgram, hasScheduledWorkouts)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Account"
          value={account.primary}
          hint={account.secondary}
        />
        <StatCard label="Client status" value={roster.primary} hint={roster.secondary} />
        <StatCard label="Client since" value={since.primary} hint={since.secondary} />
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
            <DetailRow label="Current program" value={
              activeAssignment?.program.name ?? 'Not assigned yet'
            } emphasize={Boolean(activeAssignment)} />
            <DetailRow label="Next session" value={
              upcomingSession
                ? `${upcomingSession.name} · ${upcomingSession.scheduled_date.replace(/-/g, '/')}`
                : 'No sessions scheduled'
            } />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
            <SectionLabel>Pre-session snapshot</SectionLabel>
            <Badge variant={insight.variant}>{insight.badge}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5">
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
                    ? 'Coach notes on file — review below'
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
                    : 'Assign a program on the Programs tab'
                }
              />
              <ChecklistRow
                done={hasScheduledWorkouts}
                label={
                  hasScheduledWorkouts
                    ? `${weekSessions.length} workout${weekSessions.length === 1 ? '' : 's'} scheduled this week`
                    : 'Schedule workouts on the Calendar tab'
                }
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {formatRelativeUpdated(client.updated_at)}
            </p>
          </CardContent>
        </Card>
      </div>

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
              return (
                <div key={dateKey} className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'flex size-10 flex-col items-center justify-center rounded-lg border sm:size-11',
                      isToday
                        ? 'border-brand bg-brand text-brand-foreground'
                        : session
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                          : 'border-border bg-muted/40 text-muted-foreground'
                    )}
                    aria-hidden
                  >
                    {session ? (
                      <span className="text-[10px] font-semibold">
                        {session.name.slice(0, 3)}
                      </span>
                    ) : (
                      <Minus className="size-4" strokeWidth={2.5} />
                    )}
                  </div>
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
              ? 'Scheduled workouts appear on the calendar tab.'
              : 'No workouts scheduled this week — use the Calendar tab to plan sessions.'}
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-0">
          <SectionLabel>Coach notes</SectionLabel>
          {onOpenNotes && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 gap-1 px-2 text-xs"
              onClick={onOpenNotes}
            >
              {hasNotes ? 'Edit notes' : 'Add notes'}
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {hasNotes ? (
            <blockquote className="border-brand text-foreground border-l-[3px] py-1 pl-4 text-sm leading-relaxed">
              {client.notes!.trim()}
            </blockquote>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed">
              No notes yet. Jot down injuries, preferences, or context from
              your last session so you are prepared before the next one.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
