import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type InviteAcceptedNotificationEmailPayload = {
  coachName: string
  coachEmail: string
  clientName: string
  clientId: string
  programAssigned?: boolean
}

export function buildInviteAcceptedNotificationEmailContent(
  payload: InviteAcceptedNotificationEmailPayload
) {
  const clientUrl = `${getAppBaseUrl()}/clients/${payload.clientId}`
  const subject = `${payload.clientName} joined your coaching portal`

  const automationLine = payload.programAssigned
    ? 'Their default onboarding program was assigned automatically.'
    : null

  const text = [
    `Hi ${payload.coachName},`,
    '',
    `${payload.clientName} accepted your invite and can now access the client portal.`,
    automationLine,
    '',
    `View client: ${clientUrl}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Client onboarding</p>
      <h1 style="margin:0 0 8px;font-size:24px;">${escapeHtml(payload.clientName)} joined your portal</h1>
      <p style="margin:0 0 20px;color:#334155;">They accepted your invite and can now log workouts, submit check-ins, and message you from the client app.</p>
      ${
        payload.programAssigned
          ? `<p style="margin:0 0 20px;color:#334155;">Their default onboarding program was assigned automatically.</p>`
          : ''
      }
      <a href="${clientUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">View client</a>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

export async function sendInviteAcceptedNotificationEmail(
  payload: InviteAcceptedNotificationEmailPayload
) {
  const content = buildInviteAcceptedNotificationEmailContent(payload)
  return sendEmail({
    to: payload.coachEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
