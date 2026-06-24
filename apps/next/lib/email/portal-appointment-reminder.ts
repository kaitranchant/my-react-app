import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalAppointmentReminderEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  sessionWhen: string
  location?: string | null
}

export function buildPortalAppointmentReminderEmailContent(
  payload: PortalAppointmentReminderEmailPayload
) {
  const sessionsUrl = `${getAppBaseUrl()}/portal/sessions`
  const subject = `Session reminder: ${payload.sessionWhen}`

  const locationLine = payload.location?.trim()
    ? `\nLocation: ${payload.location.trim()}`
    : ''

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `Reminder: you have a coaching session with ${payload.coachName} coming up.`,
    '',
    `When: ${payload.sessionWhen}${locationLine}`,
    '',
    `View details: ${sessionsUrl}`,
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(payload.clientName)},</p>
    <p>Reminder: you have a coaching session with <strong>${escapeHtml(payload.coachName)}</strong> coming up.</p>
    <p><strong>When:</strong> ${escapeHtml(payload.sessionWhen)}</p>
    ${
      payload.location?.trim()
        ? `<p><strong>Location:</strong> ${escapeHtml(payload.location.trim())}</p>`
        : ''
    }
    <p><a href="${sessionsUrl}">View session details</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendPortalAppointmentReminderEmail(
  payload: PortalAppointmentReminderEmailPayload
) {
  const content = buildPortalAppointmentReminderEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
