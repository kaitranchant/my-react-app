import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalCoachMessageEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  messagePreview: string
}

export function buildPortalCoachMessageEmailContent(
  payload: PortalCoachMessageEmailPayload
) {
  const messagesUrl = `${getAppBaseUrl()}/portal/messages`
  const preview =
    payload.messagePreview.length > 280
      ? `${payload.messagePreview.slice(0, 277)}…`
      : payload.messagePreview
  const subject = `New message from ${payload.coachName}`

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.coachName} sent you a message:`,
    '',
    preview,
    '',
    `Open your messages: ${messagesUrl}`,
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(payload.clientName)},</p>
    <p><strong>${escapeHtml(payload.coachName)}</strong> sent you a message:</p>
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #e5e7eb;color:#374151;">
      ${escapeHtml(preview)}
    </blockquote>
    <p><a href="${messagesUrl}">Open messages in your portal</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendPortalCoachMessageEmail(
  payload: PortalCoachMessageEmailPayload
) {
  const content = buildPortalCoachMessageEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
