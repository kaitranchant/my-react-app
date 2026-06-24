import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalFormReviewReplyEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  reviewTitle: string
  coachFeedback?: string | null
}

export function buildPortalFormReviewReplyEmailContent(
  payload: PortalFormReviewReplyEmailPayload
) {
  const formReviewUrl = `${getAppBaseUrl()}/portal/form-review`
  const subject = `${payload.coachName} replied to your form review`
  const feedback = payload.coachFeedback?.trim()

  const textLines = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.coachName} left feedback on "${payload.reviewTitle}".`,
  ]

  if (feedback) {
    textLines.push('', 'Coach feedback:', feedback)
  }

  textLines.push('', `Open form review: ${formReviewUrl}`)

  const htmlParts = [
    `<p>Hi ${escapeHtml(payload.clientName)},</p>`,
    `<p><strong>${escapeHtml(payload.coachName)}</strong> left feedback on <strong>${escapeHtml(payload.reviewTitle)}</strong>.</p>`,
  ]

  if (feedback) {
    htmlParts.push(
      `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #e5e7eb;color:#374151;">${escapeHtml(feedback)}</blockquote>`
    )
  }

  htmlParts.push(
    `<p><a href="${formReviewUrl}">Open form review in your portal</a></p>`
  )

  return {
    subject,
    text: textLines.join('\n'),
    html: htmlParts.join('\n'),
  }
}

export async function sendPortalFormReviewReplyEmail(
  payload: PortalFormReviewReplyEmailPayload
) {
  const content = buildPortalFormReviewReplyEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
