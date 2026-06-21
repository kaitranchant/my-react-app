import { formatActivityMessage } from '@/lib/dashboard'
import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'
import type { WeeklySummaryPayload } from '@/lib/notifications/weekly-summary-data'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderActionItemsHtml(items: WeeklySummaryPayload['actionItems']): string {
  if (items.length === 0) {
    return '<p style="margin:0;color:#64748b;">No action items right now — nice work.</p>'
  }

  return `<ul style="margin:0;padding-left:20px;">${items
    .map(
      (item) =>
        `<li style="margin-bottom:8px;"><a href="${getAppBaseUrl()}${item.href}" style="color:#0f172a;text-decoration:none;">${escapeHtml(item.message)}</a></li>`
    )
    .join('')}</ul>`
}

function renderActivityHtml(items: WeeklySummaryPayload['activityItems']): string {
  if (items.length === 0) {
    return '<p style="margin:0;color:#64748b;">No recent client activity to show.</p>'
  }

  return `<ul style="margin:0;padding-left:20px;">${items
    .map((item) => {
      const message = `${item.clientName} ${formatActivityMessage(item)}`
      return `<li style="margin-bottom:8px;">${escapeHtml(message)}</li>`
    })
    .join('')}</ul>`
}

export function buildWeeklySummaryEmailContent(summary: WeeklySummaryPayload) {
  const dashboardUrl = `${getAppBaseUrl()}/dashboard`
  const completionLabel =
    summary.completionRate === null
      ? 'No scheduled workouts yet this week'
      : `${summary.completionRate}% workout completion`

  const subject = `Weekly coaching summary — ${summary.weekLabel}`

  const text = [
    `Hi ${summary.coachName},`,
    '',
    `Here is your coaching recap for ${summary.weekLabel}.`,
    '',
    `Active clients: ${summary.activeClients}`,
    `Scheduled workouts this week: ${summary.weekWorkoutCount}`,
    completionLabel,
    '',
    'Action items:',
    ...(summary.actionItems.length > 0
      ? summary.actionItems.map((item) => `- ${item.message} (${dashboardUrl}${item.href})`)
      : ['- None right now']),
    '',
    'Recent activity:',
    ...(summary.activityItems.length > 0
      ? summary.activityItems.map(
          (item) => `- ${item.clientName} ${formatActivityMessage(item)}`
        )
      : ['- None to show']),
    '',
    `Open your dashboard: ${dashboardUrl}`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Weekly summary</p>
      <h1 style="margin:0 0 8px;font-size:24px;">Hi ${escapeHtml(summary.coachName)},</h1>
      <p style="margin:0 0 20px;color:#334155;">Your coaching recap for <strong>${escapeHtml(summary.weekLabel)}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:12px;border:1px solid #e2e8f0;border-radius:12px 0 0 12px;background:#f8fafc;">
            <div style="font-size:12px;color:#64748b;">Active clients</div>
            <div style="font-size:20px;font-weight:600;">${summary.activeClients}</div>
          </td>
          <td style="padding:12px;border:1px solid #e2e8f0;border-left:none;background:#f8fafc;">
            <div style="font-size:12px;color:#64748b;">Workouts this week</div>
            <div style="font-size:20px;font-weight:600;">${summary.weekWorkoutCount}</div>
          </td>
          <td style="padding:12px;border:1px solid #e2e8f0;border-left:none;border-radius:0 12px 12px 0;background:#f8fafc;">
            <div style="font-size:12px;color:#64748b;">Completion</div>
            <div style="font-size:20px;font-weight:600;">${
              summary.completionRate === null ? '—' : `${summary.completionRate}%`
            }</div>
          </td>
        </tr>
      </table>

      <h2 style="margin:0 0 12px;font-size:18px;">Action items</h2>
      ${renderActionItemsHtml(summary.actionItems)}

      <h2 style="margin:24px 0 12px;font-size:18px;">Recent activity</h2>
      ${renderActivityHtml(summary.activityItems)}

      <p style="margin:24px 0 0;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:999px;font-weight:600;">Open dashboard</a>
      </p>
    </div>
  </body>
</html>`

  return { subject, html, text }
}

export async function sendWeeklySummaryEmail(summary: WeeklySummaryPayload) {
  const { subject, html, text } = buildWeeklySummaryEmailContent(summary)

  return sendEmail({
    to: summary.coachEmail,
    subject,
    html,
    text,
  })
}
