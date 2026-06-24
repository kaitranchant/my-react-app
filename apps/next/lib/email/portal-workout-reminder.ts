import { getAppBaseUrl } from '@/lib/email/config'
import { sendEmail } from '@/lib/email/send'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export type PortalWorkoutReminderEmailPayload = {
  clientName: string
  clientEmail: string
  coachName: string
  workoutName: string
}

export function buildPortalWorkoutReminderEmailContent(
  payload: PortalWorkoutReminderEmailPayload
) {
  const trainingUrl = `${getAppBaseUrl()}/portal/training`
  const subject = `Workout today: ${payload.workoutName}`

  const text = [
    `Hi ${payload.clientName},`,
    '',
    `You have "${payload.workoutName}" scheduled for today.`,
    '',
    `Open your portal to start: ${trainingUrl}`,
  ].join('\n')

  const html = `
    <p>Hi ${escapeHtml(payload.clientName)},</p>
    <p>You have <strong>${escapeHtml(payload.workoutName)}</strong> scheduled for today.</p>
    <p><a href="${trainingUrl}">Open training in your portal</a></p>
  `.trim()

  return { subject, text, html }
}

export async function sendPortalWorkoutReminderEmail(
  payload: PortalWorkoutReminderEmailPayload
) {
  const content = buildPortalWorkoutReminderEmailContent(payload)
  return sendEmail({
    to: payload.clientEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
}
