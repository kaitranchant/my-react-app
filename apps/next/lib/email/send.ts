import { Resend } from 'resend'

import { getEmailFromAddress, isEmailDeliveryConfigured, formatResendDeliveryError } from '@/lib/email/config'

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean }

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!isEmailDeliveryConfigured()) {
    return { ok: false, error: 'Email delivery is not configured.', skipped: true }
  }

  const resend = getResendClient()
  if (!resend) {
    return { ok: false, error: 'Email delivery is not configured.', skipped: true }
  }

  const { data, error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  if (error) {
    return { ok: false, error: formatResendDeliveryError(error.message) }
  }

  return { ok: true, id: data?.id ?? 'unknown' }
}
