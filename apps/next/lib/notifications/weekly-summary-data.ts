import {
  getCheckInPeriodBounds,
  getCheckInPeriodLabel,
} from '@/lib/check-in-cadence'
import {
  parseCoachPreferences,
  type CoachPreferences,
} from '@/lib/coach-preferences'
import {
  buildActionItems,
  buildActivityFeed,
  buildCheckInActivityFeed,
  buildFormReviewActivityFeed,
  calcWorkoutCompletionRate,
  getWeekRange,
  mergeActivityFeed,
  type ActionItem,
  type ActivityItem,
} from '@/lib/dashboard'
import { fetchCoachNavBadges } from '@/lib/dashboard-queries'
import { fetchCoachDashboardLoadAlerts } from '@/lib/load-queries'
import {
  filterActionItemsForNotifications,
  filterActivityFeedForNotifications,
  parseNotificationPreferences,
} from '@/lib/notification-preferences'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { Client } from 'app/types/database'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type WeeklySummaryPayload = {
  coachId: string
  coachName: string
  coachEmail: string
  weekLabel: string
  activeClients: number
  completionRate: number | null
  weekWorkoutCount: number
  actionItems: ActionItem[]
  activityItems: ActivityItem[]
}

function formatWeekLabel(
  weekStart: string,
  weekEnd: string,
  timezone: CoachPreferences['timezone']
): string {
  const start = new Date(`${weekStart}T12:00:00`)
  const end = new Date(`${weekEnd}T12:00:00`)
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    timeZone: timezone === 'auto' ? undefined : timezone,
  }

  const startLabel = start.toLocaleDateString('en-US', options)
  const endLabel = end.toLocaleDateString('en-US', {
    ...options,
    year: start.getFullYear() === end.getFullYear() ? undefined : 'numeric',
  })

  return `${startLabel} – ${endLabel}`
}

export async function buildWeeklySummaryForCoach(
  admin: AdminClient,
  coachId: string,
  coachEmail: string
): Promise<WeeklySummaryPayload | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select(
      'full_name, weight_unit, week_starts_on, coach_timezone, default_check_in_frequency, notify_check_ins, notify_form_reviews, notify_workout_completions, notify_missed_sessions, notify_invite_accepted, notify_prs, notify_weekly_summary'
    )
    .eq('id', coachId)
    .maybeSingle()

  if (!profile?.notify_weekly_summary) {
    return null
  }

  const coachPreferences = parseCoachPreferences(profile)
  const notificationPreferences = parseNotificationPreferences(profile)
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

  const [
    { data: clients },
    { data: weekWorkouts },
    { data: weekCheckIns },
    { count: pendingCheckInsCount },
    { data: recentWorkouts },
    { data: recentCheckIns },
    { data: recentFormReviews },
    navBadges,
  ] = await Promise.all([
    admin
      .from('clients')
      .select('id, full_name, status, invite_status, is_coach_self')
      .eq('coach_id', coachId)
      .eq('is_coach_self', false)
      .order('full_name'),
    admin
      .from('client_scheduled_workouts')
      .select('status, client_id, clients!inner(is_coach_self, coach_id)')
      .eq('clients.coach_id', coachId)
      .eq('clients.is_coach_self', false)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd),
    admin
      .from('client_check_ins')
      .select('client_id')
      .eq('coach_id', coachId)
      .gte('check_in_date', checkInPeriodStart)
      .lte('check_in_date', checkInPeriodEnd),
    admin
      .from('client_check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .is('reviewed_at', null)
      .eq('submitted_by', 'client'),
    admin
      .from('client_scheduled_workouts')
      .select(
        'id, name, status, completed_at, started_at, updated_at, client_id, clients!inner(full_name, is_coach_self, coach_id)'
      )
      .eq('clients.coach_id', coachId)
      .eq('clients.is_coach_self', false)
      .in('status', ['completed', 'in_progress', 'skipped'])
      .order('updated_at', { ascending: false })
      .limit(12),
    admin
      .from('client_check_ins')
      .select('id, client_id, updated_at, created_at, clients(full_name)')
      .eq('coach_id', coachId)
      .order('updated_at', { ascending: false })
      .limit(8),
    admin
      .from('client_form_reviews')
      .select('id, client_id, title, created_at, clients(full_name)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(8),
    fetchCoachNavBadges(admin, coachId),
  ])

  const allClients = (clients ?? []) as Pick<
    Client,
    'id' | 'full_name' | 'status' | 'invite_status'
  >[]
  const activeClients = allClients.filter((client) => client.status === 'active')
  const pendingInvites = allClients.filter(
    (client) => client.invite_status === 'pending'
  ).length

  const weekWorkoutList = weekWorkouts ?? []
  const completionRate = calcWorkoutCompletionRate(weekWorkoutList)
  const skippedThisWeek = weekWorkoutList.filter(
    (workout) => workout.status === 'skipped'
  ).length

  const activeClientIdsWithWorkout = new Set(
    weekWorkoutList
      .filter(
        (workout) =>
          workout.status === 'completed' || workout.status === 'in_progress'
      )
      .map((workout) => workout.client_id)
  )
  const clientsWithoutWorkoutThisWeek = activeClients.filter(
    (client) => !activeClientIdsWithWorkout.has(client.id)
  ).length

  const activeClientIdsWithCheckIn = new Set(
    (weekCheckIns ?? []).map((checkIn) => checkIn.client_id)
  )
  const clientsWithoutCheckInThisPeriod = activeClients.filter(
    (client) => !activeClientIdsWithCheckIn.has(client.id)
  ).length

  const loadAlerts =
    activeClients.length > 0
      ? await fetchCoachDashboardLoadAlerts(
          admin,
          activeClients.map((client) => ({
            id: client.id,
            full_name: client.full_name,
          }))
        )
      : { elevatedLoadCount: 0, injuryFlagCount: 0, clientContexts: [] }

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
    }),
    notificationPreferences
  )

  const activityItems = filterActivityFeedForNotifications(
    mergeActivityFeed(
      buildActivityFeed(
        (recentWorkouts ?? []).map((workout) => {
          const client = workout.clients as { full_name: string } | null
          return {
            id: workout.id,
            name: workout.name,
            status: workout.status,
            completed_at: workout.completed_at,
            started_at: workout.started_at,
            updated_at: workout.updated_at,
            client_id: workout.client_id,
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
      )
    ),
    notificationPreferences
  )

  const coachName =
    profile.full_name?.trim() || coachEmail.split('@')[0] || 'Coach'

  return {
    coachId,
    coachName,
    coachEmail,
    weekLabel: formatWeekLabel(
      weekStart,
      weekEnd,
      coachPreferences.timezone
    ),
    activeClients: activeClients.length,
    completionRate,
    weekWorkoutCount: weekWorkoutList.length,
    actionItems,
    activityItems,
  }
}

export async function listWeeklySummaryCoachIds(
  admin: AdminClient
): Promise<string[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'coach')
    .eq('notify_weekly_summary', true)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => row.id)
}
