import loadEnvLocal from './load-env-local.mjs'
import { createAdminClient } from '../lib/supabase/admin'

loadEnvLocal()

async function main() {
  const admin = createAdminClient()
  const coachId = 'd18ca141-c03e-4477-857b-4ce509a4f695'

  const { data: missingGoogle } = await admin
    .from('coaching_appointments')
    .select('starts_at, client:clients(full_name)')
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .is('google_calendar_event_id', null)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(20)

  const { count: missingCount } = await admin
    .from('coaching_appointments')
    .select('id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'scheduled')
    .is('google_calendar_event_id', null)
    .gte('starts_at', new Date().toISOString())

  console.log('missing google count:', missingCount)
  console.log(JSON.stringify(missingGoogle, null, 2))
}

main().catch(console.error)
