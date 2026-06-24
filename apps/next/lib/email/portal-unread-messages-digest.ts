import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalUnreadMessagesDigestEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  unreadCount: number
  latestMessagePreview: string | null
}

export function buildPortalUnreadMessagesDigestEmailContent(
  payload: PortalUnreadMessagesDigestEmailPayload
) {
  const messagesUrl = `${getAppBaseUrl()}/portal/messages`
  const countLabel =
    payload.unreadCount === 1
      ? '1 unread message'
      : `${payload.unreadCount} unread messages`
  const subject = `${countLabel} from ${payload.coachName}`

  const preview =
    payload.latestMessagePreview &&
    payload.latestMessagePreview.length > 280
      ? `${payload.latestMessagePreview.slice(0, 277)}…`
      : payload.latestMessagePreview

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `You have ${countLabel} from ${payload.coachName}.`,
    ...(preview ? ['', preview, ''] : ['']),
    `Open your messages: ${messagesUrl}`,
  ].join('\n')

  const previewHtml = preview
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #e5e7eb;color:#374151;">${escapeHtml(preview)}</blockquote>`
    : ''

  const html = `
    <p>Hi ${escapeHtml(payload.clientName)},</p>
    <p>You have <strong>${escapeHtml(countLabel)}</strong> from ${escapeHtml(payload.coachName)}.</p>
    ${previewHtml}
    <p><a href="${messagesUrl}">Open messages in your portal</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendPortalUnreadMessagesDigestEmail(
  payload: PortalUnreadMessagesDigestEmailPayload
) {
  const content = buildPortalUnreadMessagesDigestEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
