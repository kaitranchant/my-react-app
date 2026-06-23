import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'
import {
  getFormReviewTitle,
  isFormReviewImage,
} from '@/lib/form-reviews'
import type { ClientFormReview } from 'app/types/database'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type FormReviewNotificationEmailPayload = {
  coachName: string
  coachEmail: string
  clientName: string
  clientId: string
  review: Pick<
    ClientFormReview,
    'title' | 'content_type' | 'client_notes' | 'scheduled_workout_id'
  > & {
    exercise?: { name: string } | null
  }
  workoutName?: string | null
}

function getMediaLabel(contentType: string): string {
  return isFormReviewImage(contentType) ? 'photo' : 'video'
}

export function buildFormReviewNotificationEmailContent(
  payload: FormReviewNotificationEmailPayload
) {
  const reviewTitle = getFormReviewTitle(payload.review)
  const mediaLabel = getMediaLabel(payload.review.content_type)
  const inboxUrl = `${getAppBaseUrl()}/form-review`
  const clientUrl = `${getAppBaseUrl()}/clients/${payload.clientId}`

  const contextParts: string[] = []
  if (payload.workoutName) {
    contextParts.push(`from ${payload.workoutName}`)
  } else if (payload.review.scheduled_workout_id) {
    contextParts.push('from a workout log')
  }

  const subject = `${payload.clientName} submitted a form review — ${reviewTitle}`

  const detailLines = [
    `Submission: ${reviewTitle} (${mediaLabel})`,
    ...contextParts,
    payload.review.client_notes?.trim()
      ? `Client notes: ${payload.review.client_notes.trim()}`
      : null,
  ].filter((line): line is string => Boolean(line))

  const text = [
    `Hi ${payload.coachName},`,
    '',
    `${payload.clientName} submitted a new form review${contextParts.length > 0 ? ` ${contextParts[0]}` : ''}.`,
    '',
    ...detailLines,
    '',
    `Review inbox: ${inboxUrl}`,
    `View client: ${clientUrl}`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Form review</p>
      <h1 style="margin:0 0 8px;font-size:24px;">${escapeHtml(payload.clientName)} submitted a ${escapeHtml(mediaLabel)}</h1>
      <p style="margin:0 0 20px;color:#334155;"><strong>${escapeHtml(reviewTitle)}</strong>${payload.workoutName ? ` · ${escapeHtml(payload.workoutName)}` : payload.review.scheduled_workout_id ? ' · From workout log' : ''}</p>
      ${
        payload.review.client_notes?.trim()
          ? `<p style="margin:0 0 24px;color:#334155;white-space:pre-wrap;">${escapeHtml(payload.review.client_notes.trim())}</p>`
          : ''
      }
      <a href="${inboxUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Open form review inbox</a>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

export async function sendFormReviewNotificationEmail(
  payload: FormReviewNotificationEmailPayload
) {
  const content = buildFormReviewNotificationEmailContent(payload)
  return sendEmail({
    to: payload.coachEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
