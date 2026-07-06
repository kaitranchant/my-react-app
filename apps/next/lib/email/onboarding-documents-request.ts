import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type OnboardingDocumentsEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  signUrl: string
  documentNames: string[]
}

export function buildOnboardingDocumentsEmailContent(
  payload: OnboardingDocumentsEmailPayload
) {
  const documentList = payload.documentNames.map((name) => `• ${name}`).join('\n')
  const subject = `${payload.coachName} sent documents to sign`

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.coachName} sent you onboarding documents to review and sign:`,
    documentList,
    '',
    `Sign your documents: ${payload.signUrl}`,
    '',
    'This link is personal to you. If it expires, ask your coach to send a new one.',
  ].join('\n')

  const documentsHtml = payload.documentNames
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join('')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Onboarding documents</p>
      <h1 style="margin:0 0 8px;font-size:24px;">Documents ready to sign</h1>
      <p style="margin:0 0 16px;color:#334155;">${escapeHtml(payload.coachName)} sent you onboarding documents to review and sign.</p>
      <ul style="margin:0 0 20px;padding-left:20px;color:#334155;">${documentsHtml}</ul>
      <a href="${payload.signUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">Review and sign</a>
      <p style="margin:20px 0 0;color:#64748b;font-size:13px;">This link is personal to you. If it expires, ask your coach to send a new one.</p>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

export async function sendOnboardingDocumentsEmail(
  payload: OnboardingDocumentsEmailPayload
) {
  const content = buildOnboardingDocumentsEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
