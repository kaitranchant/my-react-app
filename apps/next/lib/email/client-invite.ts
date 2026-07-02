import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type ClientInviteEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  inviteUrl: string
}

export function buildClientInviteEmailContent(payload: ClientInviteEmailPayload) {
  const subject = `${payload.coachName} invited you to your coaching portal`

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.coachName} invited you to create your client account.`,
    '',
    `Create your account: ${payload.inviteUrl}`,
    '',
    'This link is personal to you. If it expires, ask your coach to send a new one.',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Coaching portal invite</p>
      <h1 style="margin:0 0 8px;font-size:24px;">You're invited, ${escapeHtml(payload.clientName)}</h1>
      <p style="margin:0 0 20px;color:#334155;">${escapeHtml(payload.coachName)} invited you to create your client account so you can view workouts, log training, submit check-ins, and message your coach.</p>
      <a href="${payload.inviteUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Create your account</a>
      <p style="margin:20px 0 0;color:#64748b;font-size:13px;">This link is personal to you. If it expires, ask your coach to send a new one.</p>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

export async function sendClientInviteEmail(payload: ClientInviteEmailPayload) {
  const content = buildClientInviteEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
