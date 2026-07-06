import {
  coachClientNotificationSelect,
  parseCoachClientNotificationPreferences,
} from '@/lib/coach-client-notification-preferences'
import {
  getCheckInPeriodBounds,
  getPortalCheckInDueLabel,
} from '@/lib/check-in-cadence'
import { getMessagePreviewText } from '@/lib/message-media'
import {
  getCoachDateKey,
  parseCoachPreferences,
} from '@/lib/coach-preferences'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendPortalCheckInDueReminderEmail } from '@/lib/email/portal-check-in-due-reminder'
import { sendPortalUnreadMessagesDigestEmail } from '@/lib/email/portal-unread-messages-digest'
import { sendPortalWorkoutReminderEmail } from '@/lib/email/portal-workout-reminder'
import {
  getCheckInDueReferenceKey,
  shouldSendCheckInDueNudge,
  type ClientEmailNudgeType,
} from '@/lib/notifications/client-nudges'
import { sendPortalClientWebPushNotification } from '@/lib/notifications/send-web-push-notification'
import { parsePortalNotificationPreferences } from '@/lib/portal-notification-preferences'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { CheckInFrequency, Profile } from 'app/types/database'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type ClientNudgeResult = {
  clientId: string
  nudgeType: ClientEmailNudgeType
  status: 'sent' | 'skipped' | 'failed'
  error?: string
}

type PortalClientRow = {
  id: string
  user_id: string
  full_name: string
  email: string | null
  coach_id: string
}

type CoachProfileRow = Pick<
  Profile,
  | 'id'
  | 'full_name'
  | 'business_name'
  | 'weight_unit'
  | 'week_starts_on'
  | 'coach_timezone'
  | 'default_check_in_frequency'
  | 'coach_send_client_messages'
  | 'coach_send_client_check_in_reviews'
  | 'coach_send_client_form_review_replies'
  | 'coach_send_client_nutrition_setup'
  | 'coach_send_client_team_updates'
  | 'coach_send_client_invites'
  | 'coach_send_client_workout_reminders'
  | 'coach_send_client_check_in_reminders'
  | 'coach_send_client_unread_digest'
  | 'coach_send_client_appointment_reminders'
  | 'coach_send_client_onboarding_documents'
>

type WorkoutRow = {
  id: string
  client_id: string
  name: string
  scheduled_date: string
  status: string
}

function getCoachDisplayName(profile: CoachProfileRow): string {
  return (
    profile.business_name?.trim() ||
    profile.full_name?.trim() ||
    'Your coach'
  )
}

async function fetchSentNudgeKeys(
  admin: AdminClient,
  clientIds: string[],
  nudgeType: ClientEmailNudgeType,
  referenceKeys: string[]
): Promise<Set<string>> {
  if (clientIds.length === 0 || referenceKeys.length === 0) {
    return new Set()
  }

  const { data, error } = await admin
    .from('client_email_nudges')
    .select('client_id, reference_key')
    .eq('nudge_type', nudgeType)
    .in('client_id', clientIds)
    .in('reference_key', referenceKeys)

  if (error) {
    if (error.message.includes('client_email_nudges')) {
      return new Set()
    }
    throw new Error(error.message)
  }

  return new Set(
    (data ?? []).map((row) => `${row.client_id}:${row.reference_key}`)
  )
}

async function recordNudgeSent(
  admin: AdminClient,
  clientId: string,
  nudgeType: ClientEmailNudgeType,
  referenceKey: string
): Promise<void> {
  const { error } = await admin.from('client_email_nudges').insert({
    client_id: clientId,
    nudge_type: nudgeType,
    reference_key: referenceKey,
  })

  if (error && !error.message.includes('duplicate')) {
    throw new Error(error.message)
  }
}

async function fetchUnreadCoachMessagesForClients(
  admin: AdminClient,
  clientIds: string[]
): Promise<
  Map<string, { unreadCount: number; latestPreview: string | null }>
> {
  const result = new Map<
    string,
    { unreadCount: number; latestPreview: string | null }
  >()

  if (clientIds.length === 0) {
    return result
  }

  const [unreadResult, latestResult] = await Promise.all([
    admin.rpc('get_client_unread_from_coach', { p_client_ids: clientIds }),
    admin.rpc('get_client_latest_coach_messages', { p_client_ids: clientIds }),
  ])

  const unreadByClientId = new Map<string, number>()
  for (const row of unreadResult.data ?? []) {
    unreadByClientId.set(
      row.client_id as string,
      Number(row.unread_count ?? 0)
    )
  }

  const latestByClientId = new Map<
    string,
    { body: string | null; message_type: string | null }
  >()
  for (const row of latestResult.data ?? []) {
    latestByClientId.set(row.client_id as string, {
      body: row.body as string | null,
      message_type: row.message_type as string | null,
    })
  }

  for (const clientId of clientIds) {
    const latest = latestByClientId.get(clientId)
    if (!latest) {
      result.set(clientId, { unreadCount: 0, latestPreview: null })
      continue
    }

    const previewText = getMessagePreviewText({
      message_type: (latest.message_type ?? 'text') as 'text' | 'voice',
      body: latest.body,
    })
    const preview =
      previewText.length > 280 ? `${previewText.slice(0, 277)}…` : previewText

    result.set(clientId, {
      unreadCount: unreadByClientId.get(clientId) ?? 0,
      latestPreview: preview,
    })
  }

  return result
}

async function getClientEmail(
  admin: AdminClient,
  client: PortalClientRow
): Promise<string | null> {
  const { data: authUser, error } = await admin.auth.admin.getUserById(
    client.user_id
  )

  const email = authUser?.user?.email?.trim() || client.email?.trim() || null
  if (error || !email) {
    return null
  }

  return email
}

export async function sendClientEmailNudges(
  admin: AdminClient
): Promise<ClientNudgeResult[]> {
  const { data: clients, error: clientsError } = await admin
    .from('clients')
    .select('id, user_id, full_name, email, coach_id')
    .eq('status', 'active')
    .eq('is_coach_self', false)
    .not('user_id', 'is', null)

  if (clientsError) {
    throw new Error(clientsError.message)
  }

  const portalClients = (clients ?? []).filter(
    (client): client is PortalClientRow =>
      Boolean(client.user_id && client.id && client.coach_id)
  )

  if (portalClients.length === 0) {
    return []
  }

  const coachIds = Array.from(new Set(portalClients.map((client) => client.coach_id)))
  const { data: coachProfiles, error: coachError } = await admin
    .from('profiles')
    .select(
      `id, full_name, business_name, weight_unit, week_starts_on, coach_timezone, default_check_in_frequency, ${coachClientNotificationSelect}`
    )
    .in('id', coachIds)

  if (coachError) {
    throw new Error(coachError.message)
  }

  const coachById = new Map(
    (coachProfiles ?? []).map((profile) => [profile.id, profile as CoachProfileRow])
  )

  const clientsByCoachId = new Map<string, PortalClientRow[]>()
  for (const client of portalClients) {
    const existing = clientsByCoachId.get(client.coach_id) ?? []
    existing.push(client)
    clientsByCoachId.set(client.coach_id, existing)
  }

  const results: ClientNudgeResult[] = []

  for (const [coachId, coachClients] of Array.from(clientsByCoachId.entries())) {
    const coachProfile = coachById.get(coachId)
    if (!coachProfile) {
      continue
    }

    const coachPreferences = parseCoachPreferences(coachProfile)
    const coachClientNotificationPrefs =
      parseCoachClientNotificationPreferences(coachProfile)
    const coachName = getCoachDisplayName(coachProfile)
    const todayKey = getCoachDateKey(coachPreferences.timezone)
    const { start: periodStart, end: periodEnd } = getCheckInPeriodBounds(
      coachPreferences.defaultCheckInFrequency,
      coachPreferences.weekStartsOn,
      coachPreferences.timezone
    )
    const clientIds = coachClients.map((client: PortalClientRow) => client.id)

    const userIds = coachClients.map((client: PortalClientRow) => client.user_id)
    const { data: clientProfiles } = await admin
      .from('profiles')
      .select(
        'id, portal_notify_messages, portal_notify_check_in_reviews, portal_notify_form_review_replies, portal_notify_team_updates, portal_notify_workout_reminders, portal_notify_check_in_reminders, portal_notify_unread_digest, portal_notify_appointment_reminders'
      )
      .in('id', userIds)

    const prefsByUserId = new Map(
      (clientProfiles ?? []).map((profile) => [
        profile.id,
        parsePortalNotificationPreferences(profile),
      ])
    )

    const { data: todayWorkouts } = await admin
      .from('client_scheduled_workouts')
      .select('id, client_id, name, scheduled_date, status')
      .in('client_id', clientIds)
      .eq('scheduled_date', todayKey)
      .eq('status', 'scheduled')

    const workoutsByClientId = new Map<string, WorkoutRow[]>()
    for (const workout of (todayWorkouts ?? []) as WorkoutRow[]) {
      const existing = workoutsByClientId.get(workout.client_id) ?? []
      existing.push(workout)
      workoutsByClientId.set(workout.client_id, existing)
    }

    const workoutReferenceKeys = (todayWorkouts ?? []).map(
      (workout) => workout.id
    )
    const sentWorkoutKeys = await fetchSentNudgeKeys(
      admin,
      clientIds,
      'workout_reminder',
      workoutReferenceKeys
    )

    const { data: periodCheckIns } = await admin
      .from('client_check_ins')
      .select('client_id')
      .in('client_id', clientIds)
      .gte('check_in_date', periodStart)
      .lte('check_in_date', periodEnd)

    const clientsWithCheckIn = new Set(
      (periodCheckIns ?? []).map((row) => row.client_id)
    )

    const checkInReferenceKey = getCheckInDueReferenceKey(
      coachPreferences.defaultCheckInFrequency,
      todayKey,
      periodStart,
      periodEnd
    )
    const sentCheckInKeys = await fetchSentNudgeKeys(
      admin,
      clientIds,
      'check_in_due',
      [checkInReferenceKey]
    )

    const sentDigestKeys = await fetchSentNudgeKeys(
      admin,
      clientIds,
      'unread_digest',
      [todayKey]
    )

    const digestClientIds = coachClients
      .filter(
        (client) => prefsByUserId.get(client.user_id)?.notifyUnreadDigest
      )
      .map((client) => client.id)
    const unreadDigestByClientId = await fetchUnreadCoachMessagesForClients(
      admin,
      digestClientIds
    )

    for (const client of coachClients) {
      const prefs = prefsByUserId.get(client.user_id)
      const clientEmail = await getClientEmail(admin, client)
      const clientName = client.full_name?.trim() || 'there'

      if (!clientEmail) {
        continue
      }

      const workouts = workoutsByClientId.get(client.id) ?? []
      if (prefs?.notifyWorkoutReminders && coachClientNotificationPrefs.sendClientWorkoutReminders) {
        for (const workout of workouts) {
          const dedupeKey = `${client.id}:${workout.id}`
          if (sentWorkoutKeys.has(dedupeKey)) {
            results.push({
              clientId: client.id,
              nudgeType: 'workout_reminder',
              status: 'skipped',
            })
            continue
          }

          try {
            const sendResult = await sendPortalWorkoutReminderEmail({
              clientName,
              clientEmail,
              coachName,
              workoutName: workout.name,
            })

            if (!sendResult.ok) {
              results.push({
                clientId: client.id,
                nudgeType: 'workout_reminder',
                status: sendResult.skipped ? 'skipped' : 'failed',
                error: sendResult.error,
              })
              continue
            }

            await recordNudgeSent(
              admin,
              client.id,
              'workout_reminder',
              workout.id
            )
            await sendPortalClientWebPushNotification({
              clientUserId: client.user_id,
              preferenceKey: 'notifyWorkoutReminders',
              payload: {
                title: 'Workout reminder',
                body: `You have ${workout.name} scheduled today.`,
                url: `${getAppBaseUrl()}/portal/calendar`,
                tag: `workout-reminder-${workout.id}`,
              },
            })
            results.push({
              clientId: client.id,
              nudgeType: 'workout_reminder',
              status: 'sent',
            })
          } catch (error) {
            results.push({
              clientId: client.id,
              nudgeType: 'workout_reminder',
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      if (prefs?.notifyCheckInReminders && coachClientNotificationPrefs.sendClientCheckInReminders) {
        const hasCheckIn = clientsWithCheckIn.has(client.id)
        const shouldSend = shouldSendCheckInDueNudge(
          coachPreferences.defaultCheckInFrequency,
          todayKey,
          periodEnd,
          hasCheckIn
        )

        if (!shouldSend) {
          results.push({
            clientId: client.id,
            nudgeType: 'check_in_due',
            status: 'skipped',
          })
        } else if (sentCheckInKeys.has(`${client.id}:${checkInReferenceKey}`)) {
          results.push({
            clientId: client.id,
            nudgeType: 'check_in_due',
            status: 'skipped',
          })
        } else {
          try {
            const dueLabel = getPortalCheckInDueLabel(
              coachPreferences.defaultCheckInFrequency,
              { hasWorkoutToday: workouts.length > 0 }
            )
            const sendResult = await sendPortalCheckInDueReminderEmail({
              clientName,
              clientEmail,
              coachName,
              dueLabel,
            })

            if (!sendResult.ok) {
              results.push({
                clientId: client.id,
                nudgeType: 'check_in_due',
                status: sendResult.skipped ? 'skipped' : 'failed',
                error: sendResult.error,
              })
            } else {
              await recordNudgeSent(
                admin,
                client.id,
                'check_in_due',
                checkInReferenceKey
              )
              await sendPortalClientWebPushNotification({
                clientUserId: client.user_id,
                preferenceKey: 'notifyCheckInReminders',
                payload: {
                  title: 'Check-in reminder',
                  body: dueLabel,
                  url: `${getAppBaseUrl()}/portal/progress`,
                  tag: `check-in-due-${client.id}`,
                },
              })
              results.push({
                clientId: client.id,
                nudgeType: 'check_in_due',
                status: 'sent',
              })
            }
          } catch (error) {
            results.push({
              clientId: client.id,
              nudgeType: 'check_in_due',
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      if (prefs?.notifyUnreadDigest && coachClientNotificationPrefs.sendClientUnreadDigest) {
        if (sentDigestKeys.has(`${client.id}:${todayKey}`)) {
          results.push({
            clientId: client.id,
            nudgeType: 'unread_digest',
            status: 'skipped',
          })
        } else {
          try {
            const { unreadCount, latestPreview } =
              unreadDigestByClientId.get(client.id) ?? {
                unreadCount: 0,
                latestPreview: null,
              }

            if (unreadCount === 0) {
              results.push({
                clientId: client.id,
                nudgeType: 'unread_digest',
                status: 'skipped',
              })
            } else {
              const sendResult = await sendPortalUnreadMessagesDigestEmail({
                clientName,
                clientEmail,
                coachName,
                unreadCount,
                latestMessagePreview: latestPreview,
              })

              if (!sendResult.ok) {
                results.push({
                  clientId: client.id,
                  nudgeType: 'unread_digest',
                  status: sendResult.skipped ? 'skipped' : 'failed',
                  error: sendResult.error,
                })
              } else {
                await recordNudgeSent(
                  admin,
                  client.id,
                  'unread_digest',
                  todayKey
                )
                await sendPortalClientWebPushNotification({
                  clientUserId: client.user_id,
                  preferenceKey: 'notifyUnreadDigest',
                  payload: {
                    title: 'Unread messages',
                    body: `You have ${unreadCount} unread message${unreadCount === 1 ? '' : 's'} from ${coachName}.`,
                    url: `${getAppBaseUrl()}/portal/messages`,
                    tag: `unread-digest-${client.id}`,
                  },
                })
                results.push({
                  clientId: client.id,
                  nudgeType: 'unread_digest',
                  status: 'sent',
                })
              }
            }
          } catch (error) {
            results.push({
              clientId: client.id,
              nudgeType: 'unread_digest',
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }
    }
  }

  return results
}
