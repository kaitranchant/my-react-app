import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalNutritionSetupRequestEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
}

export function buildPortalNutritionSetupRequestEmailContent(
  payload: PortalNutritionSetupRequestEmailPayload
) {
  const nutritionUrl = `${getAppBaseUrl()}/portal/nutrition?section=plan`
  const subject = `${payload.coachName} sent you a nutrition setup form`

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `${payload.coachName} would like you to complete a short nutrition setup form before your meal plan is created.`,
    '',
    `Complete the form: ${nutritionUrl}`,
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(payload.clientName)},</p>
    <p>${escapeHtml(payload.coachName)} would like you to complete a short nutrition setup form before your meal plan is created.</p>
    <p><a href="${nutritionUrl}">Complete nutrition setup</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendPortalNutritionSetupRequestEmail(
  payload: PortalNutritionSetupRequestEmailPayload
) {
  const content = buildPortalNutritionSetupRequestEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
