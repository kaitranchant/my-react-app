import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarCheck } from 'lucide-react'

import { PortalActiveGoalsCard } from '@/components/portal/portal-active-goals-card'
import { PortalCheckInSuccessBanner } from '@/components/portal/portal-check-in-success-banner'
import { PortalFromCoachSection } from '@/components/portal/portal-from-coach-section'
import { PortalHomeStatsRow } from '@/components/portal/portal-home-stats-row'
import { PortalNextTeamEventCard } from '@/components/portal/portal-next-team-event-card'
import { PortalProgramCard } from '@/components/portal/portal-program-card'
import { PortalReadinessPrompt } from '@/components/portal/portal-readiness-prompt'
import { PortalRecentPrs } from '@/components/portal/portal-recent-prs'
import { PortalTrainingConsistencyCard } from '@/components/portal/portal-training-consistency-card'
import { PortalTodayWorkoutHero } from '@/components/portal/portal-today-workout-hero'
import { PortalWelcomeDialog } from '@/components/portal/portal-welcome-dialog'
import { PortalWeekStrip } from '@/components/portal/portal-week-strip'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getPortalCheckInDueLabel } from '@/lib/check-in-cadence'
import { getCoachDateKey } from '@/lib/coach-preferences'
import { getPortalDisplayPreferences } from '@/lib/coach-preferences-server'
import { fetchClientProgramSummary } from '@/lib/client-program-progress'
import { fetchCoachDisplayName } from '@/lib/portal-coach-name'
import { getGreeting } from '@/lib/dashboard'
import {
  fetchPortalFormReviewHighlight,
  fetchPortalHomeGoalHighlights,
  fetchPortalMessageHighlight,
} from '@/lib/portal-home-highlights'
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
    id: string
    name: string
    description: string | null
    start_date: string | null
  } | null = null

  let homeData = null
  let todayWorkout: CalendarDaySummary | null = null
  let nextTeamEvent = null
  let programSummary = null
  let goalHighlights: Awaited<
    ReturnType<typeof fetchPortalHomeGoalHighlights>
  > = []
  let formReviewHighlight: Awaited<
    ReturnType<typeof fetchPortalFormReviewHighlight>
  > = null
  let messageHighlight: Awaited<
    ReturnType<typeof fetchPortalMessageHighlight>
  > = null

  let coachPreferences = null
  let coachName = 'Coach'

  if (clientRecord?.id && user) {
    coachPreferences = await getPortalDisplayPreferences(
      user.id,
      clientRecord.coach_id
    )
    const coachTodayKey = getCoachDateKey(coachPreferences.timezone)

    const [
      assignmentResult,
      homeDataResult,
      todayWorkoutResult,
      nextTeamEventResult,
      goalHighlightsResult,
      formReviewHighlightResult,
      messageHighlightResult,
      coachNameResult,
    ] = await Promise.all([
      supabase
        .from('program_assignments')
        .select('start_date, program_id, program:programs(id, name, description)')
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
      fetchPortalHomeGoalHighlights(supabase, clientRecord.id, coachPreferences),
      fetchPortalFormReviewHighlight(supabase, clientRecord.id),
      fetchPortalMessageHighlight(supabase, clientRecord.id),
      fetchCoachDisplayName(supabase, clientRecord.coach_id),
    ])

    if (
      assignmentResult.data?.program &&
      !Array.isArray(assignmentResult.data.program)
    ) {
      activeProgram = {
        id: assignmentResult.data.program.id,
        name: assignmentResult.data.program.name,
        description: assignmentResult.data.program.description,
        start_date: assignmentResult.data.start_date,
      }
    }

    homeData = homeDataResult
    todayWorkout = (todayWorkoutResult.data as CalendarDaySummary | null) ?? null
    nextTeamEvent = nextTeamEventResult
    goalHighlights = goalHighlightsResult
    formReviewHighlight = formReviewHighlightResult
    messageHighlight = messageHighlightResult
    coachName = coachNameResult

    if (activeProgram && homeData) {
      programSummary = await fetchClientProgramSummary(
        supabase,
        activeProgram.id,
        activeProgram.start_date,
        homeData.weekSessions,
        {
          clientId: clientRecord.id,
          todayKey: coachTodayKey,
        }
      )
    }
  }

  const name =
    clientRecord?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Client'

  const firstName = name.split(/\s+/)[0] ?? name

  const shortDateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })

  const todayWorkoutStatus = todayWorkout
    ? getWorkoutDisplayStatus(
        todayWorkout.status,
        workoutHasProgress(todayWorkout, [])
      )
    : null

  const checkInDueLabel = coachPreferences
    ? getPortalCheckInDueLabel(coachPreferences.defaultCheckInFrequency, {
        hasWorkoutToday: todayWorkout != null,
      })
    : 'Due this week'

  const weekStartsOn = coachPreferences?.weekStartsOn ?? 'monday'

  const weekCard = homeData ? (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">This week</CardTitle>
        <Link
          href="/portal/workouts"
          className="text-brand flex items-center gap-1 text-xs font-medium"
        >
          Full calendar
          <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <PortalWeekStrip
          weekSessions={homeData.weekSessions}
          weekStartsOn={weekStartsOn}
        />
      </CardContent>
    </Card>
  ) : null

  const heatmapCard = homeData ? (
    <PortalTrainingConsistencyCard
      heatmap={homeData.trainingConsistency}
      weekStartsOn={weekStartsOn}
    />
  ) : null

  const submittedCheckInCard =
    homeData && homeData.checkInStatus !== 'due' ? (
      <Link href="/portal/check-in" className="group block">
        <Card className="transition-colors group-hover:border-brand/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <CalendarCheck className="text-brand size-4" />
                Check-in
              </span>
              <Badge variant={checkInStatusVariant(homeData.checkInStatus)}>
                {checkInStatusLabel(homeData.checkInStatus, checkInDueLabel)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {homeData.checkInStatus === 'submitted' ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                Check-in recorded — your coach will review it soon.
              </p>
            ) : null}
            {homeData.checkInStatus === 'reviewed' &&
              homeData.periodCheckIn?.coach_notes && (
                <p className="text-brand text-xs font-medium">
                  Coach left feedback — open to read
                </p>
              )}
          </CardContent>
        </Card>
      </Link>
    ) : null

  const programCard =
    activeProgram && homeData ? (
      <PortalProgramCard
        name={activeProgram.name}
        description={activeProgram.description}
        summary={programSummary}
      />
    ) : null

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {!clientRecord ? (
        <PortalUnlinkedState feature="see your schedule and log workouts" />
      ) : homeData ? (
        <>
          <PortalWelcomeDialog userId={user.id} coachName={coachName} />
          <Suspense fallback={null}>
            <PortalCheckInSuccessBanner />
          </Suspense>
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-base font-semibold sm:text-lg">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground shrink-0 text-sm">
              {shortDateLabel}
            </p>
          </div>

          <PortalTodayWorkoutHero
            todayWorkout={todayWorkout}
            workoutStatus={todayWorkoutStatus}
            streak={homeData.streak}
          />

          <PortalHomeStatsRow
            streak={homeData.streak}
            completionRate={homeData.completionRate}
            lastActive={homeData.lastActive}
          />

          {/* Mobile: single-column stack matching mockup order */}
          <div className="flex flex-col gap-4 lg:hidden">
            <PortalFromCoachSection
              coachName={coachName}
              messageHighlight={messageHighlight}
              formReviewHighlight={formReviewHighlight}
            />
            <PortalReadinessPrompt
              status={homeData.checkInStatus}
              dueLabel={checkInDueLabel}
            />
            {submittedCheckInCard}
            <PortalActiveGoalsCard goals={goalHighlights} />
            {weekCard}
            <PortalRecentPrs recentPrs={homeData.recentPrs} showViewAll />
            {programCard}
            {heatmapCard}
            {nextTeamEvent && (
              <PortalNextTeamEventCard nextEvent={nextTeamEvent} />
            )}
          </div>

          {/* Desktop: two-column grid */}
          <div className="hidden items-start gap-6 lg:grid lg:grid-cols-[1.35fr_22rem]">
            <div className="flex min-w-0 flex-col gap-6">
              {weekCard}
              {heatmapCard}
              <PortalActiveGoalsCard goals={goalHighlights} />
            </div>

            <aside className="flex min-w-0 flex-col gap-6">
              <PortalFromCoachSection
                coachName={coachName}
                messageHighlight={messageHighlight}
                formReviewHighlight={formReviewHighlight}
              />
              <PortalReadinessPrompt
                status={homeData.checkInStatus}
                dueLabel={checkInDueLabel}
              />
              {submittedCheckInCard}
              <PortalRecentPrs recentPrs={homeData.recentPrs} showViewAll />
              {programCard}
              {nextTeamEvent && (
                <PortalNextTeamEventCard nextEvent={nextTeamEvent} />
              )}
            </aside>
          </div>
        </>
      ) : null}
    </div>
  )
}
