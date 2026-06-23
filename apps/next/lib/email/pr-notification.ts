import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'
import { formatPrAchievementLabel } from '@/lib/pr-celebration'
import type { NewPrSummary } from '@/lib/pr-records'
import type { WeightUnit } from 'app/types/database'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PrNotificationEmailPayload = {
  coachName: string
  coachEmail: string
  clientName: string
  clientId: string
  workoutName: string
  newPrs: NewPrSummary[]
  weightUnit?: WeightUnit
}

export function buildPrNotificationEmailContent(payload: PrNotificationEmailPayload) {
  const weightUnit = payload.weightUnit ?? 'lbs'
  const clientUrl = `${getAppBaseUrl()}/clients/${payload.clientId}?tab=overview`
  const prCount = payload.newPrs.length
  const subject =
    prCount === 1
      ? `${payload.clientName} hit a new PR — ${payload.newPrs[0]?.exerciseName ?? 'Personal record'}`
      : `${payload.clientName} hit ${prCount} new personal records`

  const prLines = payload.newPrs.map(
    (pr) =>
      `• ${pr.exerciseName} — ${formatPrAchievementLabel(pr, weightUnit)}`
  )

  const text = [
    `Hi ${payload.coachName},`,
    '',
    `${payload.clientName} just set ${prCount === 1 ? 'a new personal record' : `${prCount} new personal records`} during ${payload.workoutName}.`,
    '',
    ...prLines,
    '',
    `View client: ${clientUrl}`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Personal record</p>
      <h1 style="margin:0 0 8px;font-size:24px;">${escapeHtml(payload.clientName)} hit ${prCount === 1 ? 'a PR' : `${prCount} PRs`}</h1>
      <p style="margin:0 0 20px;color:#334155;">During <strong>${escapeHtml(payload.workoutName)}</strong></p>
      <ul style="margin:0 0 24px;padding-left:20px;">
        ${payload.newPrs
          .map(
            (pr) =>
              `<li style="margin-bottom:8px;"><strong>${escapeHtml(pr.exerciseName)}</strong> — ${escapeHtml(formatPrAchievementLabel(pr, weightUnit))}</li>`
          )
          .join('')}
      </ul>
      <a href="${clientUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">View client</a>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

export async function sendPrNotificationEmail(payload: PrNotificationEmailPayload) {
  const content = buildPrNotificationEmailContent(payload)
  return sendEmail({
    to: payload.coachEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
