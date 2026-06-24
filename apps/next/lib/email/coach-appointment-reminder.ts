import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type CoachAppointmentReminderEmailPayload = {
  coachName: string
  coachEmail: string
  clientName: string
  sessionWhen: string
  location?: string | null
}

export function buildCoachAppointmentReminderEmailContent(
  payload: CoachAppointmentReminderEmailPayload
) {
  const schedulingUrl = `${getAppBaseUrl()}/scheduling`
  const subject = `Upcoming session with ${payload.clientName}`

  const locationLine = payload.location?.trim()
    ? `\nLocation: ${payload.location.trim()}`
    : ''

  const text = [
    `Hi ${payload.coachName},`,
    '',
    `You have a coaching session with ${payload.clientName} coming up.`,
    '',
    `When: ${payload.sessionWhen}${locationLine}`,
    '',
    `Open scheduling: ${schedulingUrl}`,
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(payload.coachName)},</p>
    <p>You have a coaching session with <strong>${escapeHtml(payload.clientName)}</strong> coming up.</p>
    <p><strong>When:</strong> ${escapeHtml(payload.sessionWhen)}</p>
    ${
      payload.location?.trim()
        ? `<p><strong>Location:</strong> ${escapeHtml(payload.location.trim())}</p>`
        : ''
    }
    <p><a href="${schedulingUrl}">Open scheduling</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendCoachAppointmentReminderEmail(
  payload: CoachAppointmentReminderEmailPayload
) {
  const content = buildCoachAppointmentReminderEmailContent(payload)
  return sendEmail({
    to: payload.coachEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
