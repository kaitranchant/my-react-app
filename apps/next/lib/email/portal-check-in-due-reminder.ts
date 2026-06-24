import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalCheckInDueReminderEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  dueLabel: string
}

export function buildPortalCheckInDueReminderEmailContent(
  payload: PortalCheckInDueReminderEmailPayload
) {
  const checkInsUrl = `${getAppBaseUrl()}/portal/check-ins`
  const subject = `Check-in due — ${payload.dueLabel}`

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.dueLabel}.`,
    '',
    `Submit your check-in: ${checkInsUrl}`,
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(payload.clientName)},</p>
    <p>${escapeHtml(payload.dueLabel)}.</p>
    <p><a href="${checkInsUrl}">Submit your check-in</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendPortalCheckInDueReminderEmail(
  payload: PortalCheckInDueReminderEmailPayload
) {
  const content = buildPortalCheckInDueReminderEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
