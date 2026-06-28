/**
 * Clear E2E client nutrition logs so portal-home prompt tests stay deterministic.
 * Run: node scripts/clear-e2e-nutrition-state.mjs
 */
import { createClient } from '@supabase/supabase-js'

import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const clientId =
  process.env.E2E_CLIENT_ID ?? 'cebb411a-1fa1-4939-ab5e-8d516d874df2'

if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for nutrition reset.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { error } = await supabase
  .from('client_nutrition_logs')
  .delete()
  .eq('client_id', clientId)

if (error) {
  console.error('Failed to clear E2E nutrition logs:', error.message)
  process.exit(1)
}
