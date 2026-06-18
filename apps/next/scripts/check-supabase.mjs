/**
 * Quick check that Supabase env vars are set and the project URL resolves.
 * Run: yarn workspace next-app check:supabase
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  for (const envPath of [
    resolve(__dirname, '../.env.local'),
    resolve(__dirname, '../../../.env.local'),
  ]) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq)
      const value = trimmed.slice(eq + 1)
      if (!process.env[key]) process.env[key] = value
    }
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing env vars in apps/next/.env.local or repo root .env.local')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('\nCopy apps/next/.env.example → .env.local and fill in values from Supabase Dashboard → Project Settings → API.')
  process.exit(1)
}

console.log('Checking Supabase URL:', url)

try {
  const res = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
    headers: { apikey: key },
  })
  if (res.ok) {
    console.log('OK — Supabase is reachable (HTTP', res.status + ')')
    process.exit(0)
  }
  console.error('Supabase responded with HTTP', res.status)
  console.error('The URL may be wrong, or the anon key may be invalid.')
  process.exit(1)
} catch (error) {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error
  console.error('Failed to reach Supabase:', cause instanceof Error ? cause.message : error)
  console.error('\nYour Project URL hostname does not resolve or is unreachable.')
  console.error('Go to https://supabase.com/dashboard → your project → Project Settings → API')
  console.error('Copy the exact "Project URL" into apps/next/.env.local, then run this check again.')
  process.exit(1)
}
