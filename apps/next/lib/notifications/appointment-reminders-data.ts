import { parseCoachPreferences } from '@/lib/coach-preferences'
import { sendCoachAppointmentReminderEmail } from '@/lib/email/coach-appointment-reminder'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendPortalAppointmentReminderEmail } from '@/lib/email/portal-appointment-reminder'
import { isAppointmentWithinReminderWindow } from '@/lib/notifications/appointment-reminders'
import { parsePortalNotificationPreferences } from '@/lib/portal-notification-preferences'
import {
  sendCoachWebPushNotification,
  sendPortalClientWebPushNotification,
} from '@/lib/notifications/send-web-push-notification'
import { formatAppointmentRange } from '@/lib/session-booking-slots'
import type { createAdminClient } from '@/lib/supabase/admin'
import type { Profile } from 'app/types/database'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type AppointmentReminderResult = {
  appointmentId: string
  recipient: 'client' | 'coach'
  status: 'sent' | 'skipped' | 'failed'
  error?: string
}

type AppointmentRow = {
  id: string
  coach_id: string
  client_id: string
  starts_at: string
  ends_at: string
  location: string | null
  client: { full_name: string | null; user_id: string | null; email: string | null } | null
}

type CoachProfileRow = Pick<
  Profile,
  | 'id'
  | 'full_name'
  | 'business_name'
  | 'coach_timezone'
  | 'week_starts_on'
  | 'weight_unit'
  | 'default_check_in_frequency'
  | 'notify_appointment_reminders'
  | 'appointment_reminder_hours'
>

async function fetchSentReminderRecipients(
  admin: AdminClient,
  appointmentIds: string[]
): Promise<Set<string>> {
  if (appointmentIds.length === 0) {
    return new Set()
  }

  const { data, error } = await admin
    .from('coaching_appointment_reminders')
    .select('appointment_id, recipient')
    .in('appointment_id', appointmentIds)

  if (error) {
    if (error.message.includes('coaching_appointment_reminders')) {
      return new Set()
    }
    throw new Error(error.message)
  }

  return new Set(
    (data ?? []).map((row) => `${row.appointment_id}:${row.recipient}`)
  )
}

async function recordReminderSent(
  admin: AdminClient,
  appointmentId: string,
  recipient: 'client' | 'coach'
): Promise<void> {
  const { error } = await admin.from('coaching_appointment_reminders').insert({
    appointment_id: appointmentId,
    recipient,
  })

  if (error && !error.message.includes('duplicate')) {
    throw new Error(error.message)
  }
}

async function getClientEmail(
  admin: AdminClient,
  client: NonNullable<AppointmentRow['client']> & { id?: string },
  clientId: string
): Promise<string | null> {
  if (client.user_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(client.user_id)
    const email = authUser?.user?.email?.trim()
    if (email) {
      return email
    }
  }

  const { data: clientRow } = await admin
    .from('clients')
    .select('email')
    .eq('id', clientId)
    .maybeSingle()

  return clientRow?.email?.trim() || null
}

function getCoachDisplayName(profile: CoachProfileRow): string {
  return profile.business_name?.trim() || profile.full_name?.trim() || 'Coach'
}

export async function sendAppointmentReminders(
  admin: AdminClient,
  now = new Date()
): Promise<AppointmentReminderResult[]> {
  const { data: coaches, error: coachesError } = await admin
    .from('profiles')
    .select(
      'id, full_name, business_name, coach_timezone, week_starts_on, weight_unit, default_check_in_frequency, notify_appointment_reminders, appointment_reminder_hours'
    )
    .eq('role', 'coach')

  if (coachesError) {
    throw new Error(coachesError.message)
  }

  const results: AppointmentReminderResult[] = []

  for (const coachProfile of (coaches ?? []) as CoachProfileRow[]) {
    const coachPreferences = parseCoachPreferences(coachProfile)
    const reminderHours = coachProfile.appointment_reminder_hours ?? 24
    const horizonIso = new Date(
      now.getTime() + reminderHours * 60 * 60 * 1000
    ).toISOString()

    const { data: appointments, error: appointmentsError } = await admin
      .from('coaching_appointments')
      .select(
        `
        id,
        coach_id,
        client_id,
        starts_at,
        ends_at,
        location,
        client:clients(full_name, user_id, email)
      `
      )
      .eq('coach_id', coachProfile.id)
      .eq('status', 'scheduled')
      .gt('starts_at', now.toISOString())
      .lte('starts_at', horizonIso)
      .order('starts_at')

    if (appointmentsError) {
      if (appointmentsError.message.includes('coaching_appointments')) {
        continue
      }
      throw new Error(appointmentsError.message)
    }

    const appointmentRows = (appointments ?? []).map((row) => ({
      ...row,
      client: Array.isArray(row.client) ? row.client[0] ?? null : row.client,
    })) as AppointmentRow[]

    const dueAppointments = appointmentRows.filter((appointment) =>
      isAppointmentWithinReminderWindow(appointment.starts_at, reminderHours, now)
    )

    if (dueAppointments.length === 0) {
      continue
    }

    const sentKeys = await fetchSentReminderRecipients(
      admin,
      dueAppointments.map((appointment) => appointment.id)
    )

    const coachNotificationPrefs = {
      notifyAppointmentReminders: coachProfile.notify_appointment_reminders ?? true,
    }
    const coachName = getCoachDisplayName(coachProfile)

    let coachEmail: string | null = null
    if (coachNotificationPrefs.notifyAppointmentReminders) {
      const { data: authUser } = await admin.auth.admin.getUserById(coachProfile.id)
      coachEmail = authUser?.user?.email?.trim() ?? null
    }

    for (const appointment of dueAppointments) {
      const sessionWhen = formatAppointmentRange(
        appointment.starts_at,
        appointment.ends_at,
        coachPreferences.timezone
      )
      const clientRecord = appointment.client
      const clientName = clientRecord?.full_name?.trim() || 'Client'

      if (clientRecord?.user_id) {
        const clientKey = `${appointment.id}:client`
        if (sentKeys.has(clientKey)) {
          results.push({
            appointmentId: appointment.id,
            recipient: 'client',
            status: 'skipped',
          })
        } else {
          const { data: clientProfile } = await admin
            .from('profiles')
            .select(
              'portal_notify_messages, portal_notify_check_in_reviews, portal_notify_form_review_replies, portal_notify_team_updates, portal_notify_workout_reminders, portal_notify_check_in_reminders, portal_notify_unread_digest, portal_notify_appointment_reminders'
            )
            .eq('id', clientRecord.user_id)
            .maybeSingle()

          const clientPrefs = parsePortalNotificationPreferences(clientProfile)

          if (!clientPrefs.notifyAppointmentReminders) {
            results.push({
              appointmentId: appointment.id,
              recipient: 'client',
              status: 'skipped',
            })
          } else {
            const clientEmail = await getClientEmail(
              admin,
              clientRecord,
              appointment.client_id
            )

            if (!clientEmail) {
              results.push({
                appointmentId: appointment.id,
                recipient: 'client',
                status: 'skipped',
              })
            } else {
              try {
                const sendResult = await sendPortalAppointmentReminderEmail({
                  clientName: clientName === 'Client' ? 'there' : clientName,
                  clientEmail,
                  coachName,
                  sessionWhen,
                  location: appointment.location,
                })

                if (!sendResult.ok) {
                  results.push({
                    appointmentId: appointment.id,
                    recipient: 'client',
                    status: sendResult.skipped ? 'skipped' : 'failed',
                    error: sendResult.error,
                  })
                } else {
                  await recordReminderSent(admin, appointment.id, 'client')
                  await sendPortalClientWebPushNotification({
                    clientUserId: clientRecord.user_id,
                    preferenceKey: 'notifyAppointmentReminders',
                    payload: {
                      title: 'Session reminder',
                      body: `${sessionWhen} with ${coachName}`,
                      url: `${getAppBaseUrl()}/portal/sessions`,
                      tag: `appointment-reminder-${appointment.id}`,
                    },
                  })
                  results.push({
                    appointmentId: appointment.id,
                    recipient: 'client',
                    status: 'sent',
                  })
                }
              } catch (error) {
                results.push({
                  appointmentId: appointment.id,
                  recipient: 'client',
                  status: 'failed',
                  error: error instanceof Error ? error.message : 'Unknown error',
                })
              }
            }
          }
        }
      }

      const coachKey = `${appointment.id}:coach`
      if (sentKeys.has(coachKey)) {
        results.push({
          appointmentId: appointment.id,
          recipient: 'coach',
          status: 'skipped',
        })
        continue
      }

      if (!coachNotificationPrefs.notifyAppointmentReminders || !coachEmail) {
        results.push({
          appointmentId: appointment.id,
          recipient: 'coach',
          status: 'skipped',
        })
        continue
      }

      try {
        const sendResult = await sendCoachAppointmentReminderEmail({
          coachName,
          coachEmail,
          clientName,
          sessionWhen,
          location: appointment.location,
        })

        if (!sendResult.ok) {
          results.push({
            appointmentId: appointment.id,
            recipient: 'coach',
            status: sendResult.skipped ? 'skipped' : 'failed',
            error: sendResult.error,
          })
          continue
        }

        await recordReminderSent(admin, appointment.id, 'coach')
        await sendCoachWebPushNotification({
          coachId: coachProfile.id,
          preferenceKey: 'notifyAppointmentReminders',
          payload: {
            title: 'Session reminder',
            body: `${sessionWhen} with ${clientName}`,
            url: `${getAppBaseUrl()}/scheduling`,
            tag: `coach-appointment-reminder-${appointment.id}`,
          },
        })
        results.push({
          appointmentId: appointment.id,
          recipient: 'coach',
          status: 'sent',
        })
      } catch (error) {
        results.push({
          appointmentId: appointment.id,
          recipient: 'coach',
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  }

  return results
}
