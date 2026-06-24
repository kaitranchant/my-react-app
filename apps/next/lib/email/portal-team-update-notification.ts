import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalTeamUpdateEmailPayload = {
  clientName: string
  clientEmail: string
  teamName: string
  coachName: string
  headline: string
  preview: string
}

export function buildPortalTeamUpdateEmailContent(
  payload: PortalTeamUpdateEmailPayload
) {
  const teamUrl = `${getAppBaseUrl()}/portal/team`
  const preview =
    payload.preview.length > 280
      ? `${payload.preview.slice(0, 277)}…`
      : payload.preview
  const subject = `${payload.teamName}: ${payload.headline}`

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.coachName} posted an update for ${payload.teamName}:`,
    '',
    preview,
    '',
    `Open your team page: ${teamUrl}`,
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(payload.clientName)},</p>
    <p><strong>${escapeHtml(payload.coachName)}</strong> posted an update for <strong>${escapeHtml(payload.teamName)}</strong>:</p>
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #e5e7eb;color:#374151;">
      ${escapeHtml(preview)}
    </blockquote>
    <p><a href="${teamUrl}">Open team page in your portal</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendPortalTeamUpdateEmail(
  payload: PortalTeamUpdateEmailPayload
) {
  const content = buildPortalTeamUpdateEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
