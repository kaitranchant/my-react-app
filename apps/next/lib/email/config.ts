function normalizeConfiguredUrl(raw: string): string {
  let value = raw.trim()

  // Common env typo: value pasted as "APP_URL=https://example.com"
  value = value.replace(/^APP_URL\s*=\s*/i, '')

  // Strip optional surrounding quotes from .env / Vercel UI
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim()
  }

  return value.replace(/\/$/, '')
}

export function getAppBaseUrl(): string {
  const configured = process.env.APP_URL?.trim()
  if (configured) {
    return normalizeConfiguredUrl(configured)
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return normalizeConfiguredUrl(`https://${vercelUrl}`)
  }

  return 'http://localhost:3000'
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim()
  )
}

export function getEmailFromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured.')
  }
  return from
}

export function formatResendDeliveryError(message: string): string {
  if (/only send testing emails to your own email address/i.test(message)) {
    return 'Resend is in test mode, so only your Resend account email can receive messages. Verify a domain at resend.com/domains, update RESEND_FROM_EMAIL, or copy the invite link and send it manually.'
  }

  if (/verify a domain/i.test(message)) {
    return 'Verify a domain at resend.com/domains and set RESEND_FROM_EMAIL to an address on that domain before sending client emails.'
  }

  return message
}
