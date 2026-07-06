import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type OnboardingDocumentsCompleteEmailPayload = {
  coachName: string
  coachEmail: string
  clientName: string
  clientUrl: string
  documentNames: string[]
}

export function buildOnboardingDocumentsCompleteEmailContent(
  payload: OnboardingDocumentsCompleteEmailPayload
) {
  const subject = `${payload.clientName} signed onboarding documents`
  const documentList = payload.documentNames.map((name) => `• ${name}`).join('\n')

  const text = [
    `Hi ${payload.coachName},`,
    '',
    `${payload.clientName} finished signing their onboarding documents:`,
    documentList,
    '',
    `View client: ${payload.clientUrl}`,
  ].join('\n')

  const documentsHtml = payload.documentNames
    .map((name) => `<li>${escapeHtml(name)}</li>`)
    .join('')

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,Segoe UI,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px;">Onboarding documents</p>
      <h1 style="margin:0 0 8px;font-size:24px;">${escapeHtml(payload.clientName)} signed their documents</h1>
      <ul style="margin:0 0 20px;padding-left:20px;color:#334155;">${documentsHtml}</ul>
      <a href="${payload.clientUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">View client</a>
    </div>
  </body>
</html>`

  return { subject, text, html }
}

export async function sendOnboardingDocumentsCompleteEmail(
  payload: OnboardingDocumentsCompleteEmailPayload
) {
  const content = buildOnboardingDocumentsCompleteEmailContent(payload)
  return sendEmail({
    to: payload.coachEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
