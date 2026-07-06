/**
 * Push migrations using SUPABASE_DB_PASSWORD from apps/next/.env.local.
 * Bypasses the Supabase "login role" API when dashboard/CLI management is down.
 *
 * Add to apps/next/.env.local:
 *   SUPABASE_DB_PASSWORD=your_database_password
 *
 * Then: yarn db:push:password
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const envPath = resolve(root, 'apps/next/.env.local')

if (!existsSync(envPath)) {
  console.error('Missing apps/next/.env.local')
  process.exit(1)
}

for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq)
  const value = trimmed.slice(eq + 1)
  if (!process.env[key]) process.env[key] = value
}

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('Missing SUPABASE_DB_PASSWORD in apps/next/.env.local')
  console.error('')
  console.error('This is your Postgres database password from when the project was created.')
  console.error('It bypasses the broken Supabase dashboard/login-role API.')
  console.error('')
  console.error('If you saved it elsewhere (password manager, Vercel env, etc.), add:')
  console.error('  SUPABASE_DB_PASSWORD=...')
  console.error('')
  console.error('Then run: yarn db:push:password')
  process.exit(1)
}

const result = spawnSync('npx', ['supabase', 'db', 'push', '--yes'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

process.exit(result.status ?? 1)
