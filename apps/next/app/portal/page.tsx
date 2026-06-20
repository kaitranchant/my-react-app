import Link from 'next/link'
import { ArrowRight, CalendarCheck, CalendarDays } from 'lucide-react'

import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { PortalNextTeamEventCard } from '@/components/portal/portal-next-team-event-card'
import { PortalRecentPrs } from '@/components/portal/portal-recent-prs'
import { PortalAcwrStatCard } from '@/components/portal/portal-acwr-stat'
import { PortalStatCard } from '@/components/portal/portal-stat-cards'
import { PortalWeekStrip } from '@/components/portal/portal-week-strip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCoachDateKey } from '@/lib/coach-preferences'
import { getCoachPreferencesForCoachId } from '@/lib/coach-preferences-server'
import { formatVolume } from '@/lib/load-analytics'
import { fetchPortalHomeData } from '@/lib/portal-data'
import { getPortalClientContext } from '@/lib/portal-client'
import { fetchClientNextTeamEvent } from '@/lib/portal-teams'
import { createClient } from '@/lib/supabase/server'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import type { CalendarDaySummary } from 'app/types/database'

export const metadata = {
  title: 'My program — Coaching App',
}

function checkInStatusLabel(
  status: 'due' | 'submitted' | 'reviewed',
  dueLabel: string
) {
  switch (status) {
    case 'due':
      return dueLabel
    case 'submitted':
      return 'Submitted'
    case 'reviewed':
      return 'Reviewed by coach'
  }
}

function checkInStatusVariant(
  status: 'due' | 'submitted' | 'reviewed'
): 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'due':
      return 'default'
    case 'submitted':
      return 'secondary'
    case 'reviewed':
      return 'outline'
  }
}

export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let activeProgram: {
    name: string
    description: string | null
    start_date: string | null
  } | null = null

  let homeData = null
  let todayWorkout: CalendarDaySummary | null = null
  let nextTeamEvent = null

  let coachPreferences = null


  if (clientRecord?.id) {
    coachPreferences = await getCoachPreferencesForCoachId(clientRecord.coach_id)
    const coachTodayKey = getCoachDateKey(coachPreferences.timezone)

    const [assignmentResult, homeDataResult, todayWorkoutResult, nextTeamEventResult] =
      await Promise.all([
        supabase
          .from('program_assignments')
          .select('start_date, program:programs(name, description)')
          .eq('client_id', clientRecord.id)
          .eq('status', 'active')
          .maybeSingle(),
        fetchPortalHomeData(supabase, clientRecord.id, coachPreferences),
        supabase
          .from('client_scheduled_workouts')
          .select('id, scheduled_date, name, status, started_at')
          .eq('client_id', clientRecord.id)
          .eq('scheduled_date', coachTodayKey)
          .maybeSingle(),
        fetchClientNextTeamEvent(supabase, clientRecord.id),
      ])

    if (
      assignmentResult.data?.program &&
      !Array.isArray(assignmentResult.data.program)
    ) {
      activeProgram = {
        name: assignmentResult.data.program.name,
        description: assignmentResult.data.program.description,
        start_date: assignmentResult.data.start_date,
      }
    }

    homeData = homeDataResult
    todayWorkout = (todayWorkoutResult.data as CalendarDaySummary | null) ?? null
    nextTeamEvent = nextTeamEventResult
  }

  const name =
    clientRecord?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Client'

  const avatarUrl = clientRecord?.avatar_url ?? profile?.avatar_url
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const todayWorkoutStatus = todayWorkout
    ? getWorkoutDisplayStatus(
        todayWorkout.status,
        workoutHasProgress(todayWorkout, [])
      )
    : null

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="relative space-y-4">
          <ClientAvatarUpload
            name={name}
            avatarUrl={avatarUrl}
            forClientPortal
            size="md"
          />
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm font-medium">
              {todayLabel}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome, {name}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your dashboard for workouts, check-ins, and progress.
            </p>
          </div>
        </div>
      </section>

      {activeProgram && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Your program
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p className="font-medium">{activeProgram.name}</p>
            {activeProgram.description && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {activeProgram.description}
              </p>
            )}
            {activeProgram.start_date && (
              <p className="text-muted-foreground text-xs">
                Started{' '}
                {new Date(`${activeProgram.start_date}T12:00:00`).toLocaleDateString(
                  undefined,
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!clientRecord ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Your account is not linked to a client profile yet. Ask your coach
            to send you an invite link so you can see your schedule and log
            workouts.
          </CardContent>
        </Card>
      ) : homeData ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PortalStatCard
              label="This week volume"
              value={formatVolume(
                homeData.loadMetrics?.thisWeekVolume ?? 0,
                coachPreferences?.weightUnit ?? 'lbs'
              )}
              hint={
                homeData.loadMetrics?.volumeDeltaLabel ??
                'Log workouts to track load'
              }
              accent
            />
            <PortalAcwrStatCard loadMetrics={homeData.loadMetrics} />
            <PortalStatCard
              label="Streak"
              value={
                homeData.streak > 0
                  ? `${homeData.streak} day${homeData.streak === 1 ? '' : 's'}`
                  : '—'
              }
              hint="Consecutive workout days"
            />
            <PortalStatCard
              label="Completion"
              value={
                homeData.completionRate !== null
                  ? `${homeData.completionRate}%`
                  : '—'
              }
              hint="Scheduled sessions this week"
            />
            <PortalStatCard
              label="Last active"
              value={homeData.lastActive}
              hint="Most recent session"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-semibold">This week</CardTitle>
                <CardDescription>Tap a day to open your workout.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 gap-1 px-2 text-xs"
                asChild
              >
                <Link href="/portal/workouts">
                  Full calendar
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <PortalWeekStrip
                weekSessions={homeData.weekSessions}
                weekStartsOn={coachPreferences?.weekStartsOn ?? 'monday'}
              />
            </CardContent>
          </Card>

          <section className="grid gap-4 sm:grid-cols-2">
            <Link
              href={`/portal/workouts?date=${getCoachDateKey(coachPreferences?.timezone ?? 'auto')}`}
              className="group block"
            >
              <Card className="h-full transition-colors group-hover:border-brand/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <CalendarDays className="text-brand size-5" />
                    Workouts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    View your calendar and log sets for scheduled sessions.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Today:</span>
                    {todayWorkout && todayWorkoutStatus ? (
                      <>
                        <span className="font-medium">{todayWorkout.name}</span>
                        <Badge
                          variant={
                            todayWorkoutStatus.tone === 'success'
                              ? 'success'
                              : todayWorkoutStatus.tone === 'warning'
                                ? 'warning'
                                : todayWorkoutStatus.tone === 'active'
                                  ? 'default'
                                  : 'secondary'
                          }
                        >
                          {todayWorkoutStatus.label}
                        </Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Rest day</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>

            {nextTeamEvent && (
              <PortalNextTeamEventCard nextEvent={nextTeamEvent} />
            )}

            <Link href="/portal/check-in" className="group block">
              <Card className="h-full transition-colors group-hover:border-brand/40">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
                    <span className="flex items-center gap-2">
                      <CalendarCheck className="text-brand size-5" />
                      Check-in
                    </span>
                    <Badge variant={checkInStatusVariant(homeData.checkInStatus)}>
                      {checkInStatusLabel(
                        homeData.checkInStatus,
                        homeData.checkInDueLabel
                      )}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Share sleep, energy, soreness, and how you are feeling today.
                  </p>
                  {homeData.checkInStatus === 'reviewed' &&
                    homeData.periodCheckIn?.coach_notes && (
                      <p className="text-brand text-xs font-medium">
                        Coach left feedback — open to read
                      </p>
                    )}
                </CardContent>
              </Card>
            </Link>
          </section>

          <PortalRecentPrs recentPrs={homeData.recentPrs} showViewAll />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Training history
                </CardTitle>
                <CardDescription>
                  Volume trends, PRs, and progress photos.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/portal/progress">
                  View progress
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
          </Card>
        </>
      ) : null}
    </div>
  )
}
