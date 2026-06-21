export function getAppBaseUrl(): string {
  const configured = process.env.APP_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, '')}`
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
