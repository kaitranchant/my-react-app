import { createClient } from '@/lib/supabase/server'
import {
  getCheckInPeriodBounds,
  getCheckInPeriodLabel,
} from '@/lib/check-in-cadence'
import {
  defaultCoachPreferences,
  getCoachDateKey,
} from '@/lib/coach-preferences'
import {
  buildActionItems,
  buildActivityFeed,
  buildCheckInActivityFeed,
  buildFormReviewActivityFeed,
  buildNutritionSetupActivityFeed,
  calcWorkoutCompletionRate,
  getGreeting,
  getWeekRange,
  mergeActivityFeed,
  type TodaySession,
} from '@/lib/dashboard'
import { fetchCoachNavBadges } from '@/lib/dashboard-queries'
import { countCoachTasksDueToday } from '@/lib/coach-tasks-queries'
import { fetchCoachDashboardLoadAlerts } from '@/lib/load-queries'
import { ActionItems } from '@/components/dashboard/action-items'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { CoachGettingStartedChecklist } from '@/components/dashboard/coach-getting-started-checklist'
import { CoachSetupDialog } from '@/components/dashboard/coach-setup-dialog'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { ProactiveAlerts } from '@/components/dashboard/proactive-alerts'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { TodaysSchedule } from '@/components/dashboard/todays-schedule'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import {
  defaultNotificationPreferences,
  filterActionItemsForNotifications,
  filterActivityFeedForNotifications,
  filterProactiveAlertsForNotifications,
} from '@/lib/notification-preferences'
import { getNotificationPreferencesForUser } from '@/lib/notification-preferences-server'
import { buildProactiveAlerts } from '@/lib/proactive-alerts'
import {
  coachPreferencesUnset,
  fetchCoachGettingStartedProgress,
} from '@/lib/coach-onboarding'
import { getGymsForCoach } from '@/lib/gym-access'
import type { Client } from 'app/types/database'

export const metadata = {
  title: 'Dashboard — Coaching App',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : defaultCoachPreferences
  const notificationPreferences = user
    ? await getNotificationPreferencesForUser(user.id)
    : null
  const today = getCoachDateKey(coachPreferences.timezone)
  const { start: weekStart, end: weekEnd } = getWeekRange(
    coachPreferences.weekStartsOn,
    coachPreferences.timezone
  )
  const { start: checkInPeriodStart, end: checkInPeriodEnd } =
    getCheckInPeriodBounds(
      coachPreferences.defaultCheckInFrequency,
      coachPreferences.weekStartsOn,
      coachPreferences.timezone
    )
  const checkInPeriodLabel = getCheckInPeriodLabel(
    coachPreferences.defaultCheckInFrequency
  )

  const coachGyms = user ? await getGymsForCoach(user.id) : []

  const gettingStartedProgress = user
    ? await fetchCoachGettingStartedProgress(supabase, user.id)
    : {
        hasClient: false,
        hasProgramOrWorkout: false,
        hasScheduledWorkout: false,
      }

  const [
    { data: profile },
    { data: clients },
    { data: todayWorkouts },
    { data: weekWorkouts },
    { data: recentWorkouts },
    { data: weekCheckIns },
    { count: pendingCheckInsCount },
    { data: recentCheckIns },
    { data: recentFormReviews },
    { data: recentNutritionSetups },
    navBadges,
    tasksDueToday,
  ] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'full_name, weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
        )
        .eq('id', user!.id)
        .single(),
      supabase
        .from('clients')
        .select('id, full_name, status, invite_status, is_coach_self')
        .eq('is_coach_self', false)
        .order('full_name'),
      supabase
        .from('client_scheduled_workouts')
        .select(
          'id, name, status, scheduled_date, started_at, client_id, clients!inner(full_name, is_coach_self)'
        )
        .eq('scheduled_date', today)
        .eq('clients.is_coach_self', false)
        .order('started_at', { ascending: true, nullsFirst: true })
        .order('name'),
      supabase
        .from('client_scheduled_workouts')
        .select('status, client_id, clients!inner(is_coach_self)')
        .eq('clients.is_coach_self', false)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd),
      supabase
        .from('client_scheduled_workouts')
        .select(
          'id, name, status, completed_at, started_at, updated_at, client_id, clients!inner(full_name, is_coach_self)'
        )
        .eq('clients.is_coach_self', false)
        .in('status', ['completed', 'in_progress', 'skipped'])
        .order('updated_at', { ascending: false })
        .limit(12),
      supabase
        .from('client_check_ins')
        .select('client_id')
        .gte('check_in_date', checkInPeriodStart)
        .lte('check_in_date', checkInPeriodEnd),
      supabase
        .from('client_check_ins')
        .select('*', { count: 'exact', head: true })
        .is('reviewed_at', null)
        .eq('submitted_by', 'client'),
      supabase
        .from('client_check_ins')
        .select('id, client_id, updated_at, created_at, clients(full_name)')
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('client_form_reviews')
        .select('id, client_id, title, created_at, clients(full_name)')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('client_nutrition_profiles')
        .select(
          'client_id, setup_form_completed_at, clients!inner(full_name, is_coach_self)'
        )
        .eq('clients.is_coach_self', false)
        .not('setup_form_completed_at', 'is', null)
        .order('setup_form_completed_at', { ascending: false })
        .limit(8),
      user
        ? fetchCoachNavBadges(supabase, user.id)
        : Promise.resolve({
            inboxUnread: 0,
            pendingFormReviews: 0,
            pendingProgressiveOverload: 0,
          }),
      user
        ? countCoachTasksDueToday(supabase, user.id, today)
        : Promise.resolve(0),
    ])

  const coachName =
    profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Coach'
  const firstName = coachName.split(' ')[0]

  const allClients = (clients ?? []) as Pick<
    Client,
    'id' | 'full_name' | 'status' | 'invite_status'
  >[]
  const activeClients = allClients.filter((c) => c.status === 'active')
  const pausedClients = allClients.filter((c) => c.status === 'paused').length
  const pendingInvites = allClients.filter(
    (c) => c.invite_status === 'pending'
  ).length

  const sessions: TodaySession[] = (todayWorkouts ?? []).map((w) => {
    const client = w.clients as { full_name: string } | null
    return {
      id: w.id,
      name: w.name,
      status: w.status,
      scheduled_date: w.scheduled_date,
      started_at: w.started_at,
      client_id: w.client_id,
      clientName: client?.full_name ?? 'Unknown client',
    }
  })

  const weekWorkoutList = weekWorkouts ?? []
  const completionRate = calcWorkoutCompletionRate(weekWorkoutList)
  const skippedThisWeek = weekWorkoutList.filter(
    (w) => w.status === 'skipped'
  ).length

  const activeClientIdsWithWorkout = new Set(
    weekWorkoutList
      .filter((w) => w.status === 'completed' || w.status === 'in_progress')
      .map((w) => w.client_id)
  )
  const clientsWithoutWorkoutThisWeek = activeClients.filter(
    (c) => !activeClientIdsWithWorkout.has(c.id)
  ).length

  const activeClientIdsWithCheckIn = new Set(
    (weekCheckIns ?? []).map((checkIn) => checkIn.client_id)
  )
  const clientsWithoutCheckInThisPeriod = activeClients.filter(
    (c) => !activeClientIdsWithCheckIn.has(c.id)
  ).length

  const loadAlerts =
    activeClients.length > 0
      ? await fetchCoachDashboardLoadAlerts(
          supabase,
          activeClients.map((client) => ({
            id: client.id,
            full_name: client.full_name,
          }))
        )
      : { elevatedLoadCount: 0, injuryFlagCount: 0, clientContexts: [] }

  const proactiveAlerts = filterProactiveAlertsForNotifications(
    buildProactiveAlerts({
      clientContexts: loadAlerts.clientContexts,
      pendingCheckInsCount: pendingCheckInsCount ?? 0,
    }),
    notificationPreferences ?? defaultNotificationPreferences
  )

  const actionItems = filterActionItemsForNotifications(
    buildActionItems({
      clients: allClients as Client[],
      pendingInvites,
      clientsWithoutWorkoutThisWeek,
      skippedThisWeek,
      pendingCheckIns: pendingCheckInsCount ?? 0,
      clientsWithoutCheckInThisPeriod,
      checkInPeriodLabel,
      pendingFormReviews: navBadges.pendingFormReviews,
      elevatedLoadClients: loadAlerts.elevatedLoadCount,
      injuryFlagClients: loadAlerts.injuryFlagCount,
      unreadMessages: navBadges.inboxUnread,
      tasksDueToday,
    }),
    notificationPreferences ?? defaultNotificationPreferences
  )

  const activityItems = filterActivityFeedForNotifications(
    mergeActivityFeed(
      buildActivityFeed(
        (recentWorkouts ?? []).map((w) => {
          const client = w.clients as { full_name: string } | null
          return {
            id: w.id,
            name: w.name,
            status: w.status,
            completed_at: w.completed_at,
            started_at: w.started_at,
            updated_at: w.updated_at,
            client_id: w.client_id,
            clientName: client?.full_name ?? 'Unknown client',
          }
        })
      ),
      buildCheckInActivityFeed(
        (recentCheckIns ?? []).map((checkIn) => {
          const client = checkIn.clients as { full_name: string } | null
          return {
            id: checkIn.id,
            client_id: checkIn.client_id,
            updated_at: checkIn.updated_at,
            created_at: checkIn.created_at,
            clientName: client?.full_name ?? 'Unknown client',
          }
        })
      ),
      buildFormReviewActivityFeed(
        (recentFormReviews ?? []).map((review) => {
          const client = review.clients as { full_name: string } | null
          return {
            id: review.id,
            client_id: review.client_id,
            title: review.title,
            created_at: review.created_at,
            clientName: client?.full_name ?? 'Unknown client',
          }
        })
      ),
      buildNutritionSetupActivityFeed(
        (recentNutritionSetups ?? []).map((profile) => {
          const client = profile.clients as { full_name: string } | null
          return {
            client_id: profile.client_id,
            setup_form_completed_at: profile.setup_form_completed_at!,
            clientName: client?.full_name ?? 'Unknown client',
          }
        })
      )
    ),
    notificationPreferences ?? defaultNotificationPreferences
  )

  const sessionCount = sessions.length
  const greeting = getGreeting()
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const summary =
    sessionCount > 0
      ? `${sessionCount} session${sessionCount === 1 ? '' : 's'} on your calendar today.`
      : activeClients.length > 0
        ? 'Your calendar is clear today — a great time to plan ahead for your clients.'
        : 'Welcome! Add your first client to start building their program.'

  const showCoachSetup = user ? coachPreferencesUnset(profile) : false

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:gap-8">
      {user ? (
        <CoachSetupDialog userId={user.id} show={showCoachSetup} />
      ) : null}

      <section className="space-y-4 sm:relative sm:overflow-hidden sm:rounded-2xl sm:border sm:bg-card sm:p-8 sm:shadow-card">
        <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 hidden bg-gradient-to-br via-transparent sm:block" />
        <div className="relative space-y-4 sm:space-y-5">
          <div className="space-y-1.5 sm:space-y-2">
            <p className="helper-text sm:section-header text-muted-foreground">
              {todayLabel}
            </p>
            <h1 className="page-title text-xl sm:text-[1.375rem]">
              {greeting}, {firstName}
            </h1>
            <p className="helper-text max-w-lg leading-relaxed">{summary}</p>
          </div>
          <QuickActions
            clients={activeClients.map((client) => ({
              id: client.id,
              full_name: client.full_name,
            }))}
            gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
          />
        </div>
      </section>

      {user ? (
        <CoachGettingStartedChecklist
          userId={user.id}
          progress={gettingStartedProgress}
          gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
        />
      ) : null}

      <DashboardStats
        activeClients={activeClients.length}
        totalClients={allClients.length}
        pausedClients={pausedClients}
        completionRate={completionRate}
        weekWorkoutCount={weekWorkoutList.length}
      />

      <ProactiveAlerts alerts={proactiveAlerts} />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        <TodaysSchedule sessions={sessions} />
        <ActionItems items={actionItems} />
      </div>

      <ActivityFeed items={activityItems} />
    </div>
  )
}
