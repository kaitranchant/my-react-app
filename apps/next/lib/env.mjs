const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

export function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim())
  if (missing.length === 0) return

  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}.\n` +
      'Copy apps/next/.env.example → apps/next/.env.local and fill in values from Supabase Dashboard → Project Settings → API.'
  )
}

export function hasRequiredEnv() {
  return REQUIRED_ENV.every((key) => Boolean(process.env[key]?.trim()))
}
