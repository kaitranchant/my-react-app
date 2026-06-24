import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalCheckInReviewEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  checkInDate: string
  coachNotes?: string | null
}

export function buildPortalCheckInReviewEmailContent(
  payload: PortalCheckInReviewEmailPayload
) {
  const checkInUrl = `${getAppBaseUrl()}/portal/check-in`
  const subject = `${payload.coachName} reviewed your check-in`
  const notes = payload.coachNotes?.trim()

  const textLines = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.coachName} reviewed your check-in for ${payload.checkInDate}.`,
  ]

  if (notes) {
    textLines.push('', 'Coach feedback:', notes)
  }

  textLines.push('', `Open your check-in: ${checkInUrl}`)

  const htmlParts = [
    `<p>Hi ${escapeHtml(payload.clientName)},</p>`,
    `<p><strong>${escapeHtml(payload.coachName)}</strong> reviewed your check-in for ${escapeHtml(payload.checkInDate)}.</p>`,
  ]

  if (notes) {
    htmlParts.push(
      `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #e5e7eb;color:#374151;">${escapeHtml(notes)}</blockquote>`
    )
  }

  htmlParts.push(`<p><a href="${checkInUrl}">Open check-in in your portal</a></p>`)

  return {
    subject,
    text: textLines.join('\n'),
    html: htmlParts.join('\n'),
  }
}

export async function sendPortalCheckInReviewEmail(
  payload: PortalCheckInReviewEmailPayload
) {
  const content = buildPortalCheckInReviewEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
