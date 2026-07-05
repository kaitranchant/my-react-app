import loadEnvLocal from './load-env-local.mjs'
import { finalizeCoachRecurringSeriesGoogleSync } from '../lib/google-calendar/repair-series-sync'
import { createAdminClient } from '../lib/supabase/admin'

loadEnvLocal()

async function resolveCoachId(explicitCoachId?: string) {
  const admin = createAdminClient()
  if (!admin) throw new Error('Admin client unavailable.')

  if (explicitCoachId?.trim()) return explicitCoachId.trim()

  const { data: connections } = await admin
    .from('coach_google_calendar_connections')
    .select('coach_id')
    .order('connected_at', { ascending: false })
    .limit(1)

  if (connections?.[0]?.coach_id) return connections[0].coach_id
  throw new Error('Could not infer coach id. Pass COACH_ID=uuid')
}

async function main() {
  const coachId = await resolveCoachId(process.env.COACH_ID)
  const result = await finalizeCoachRecurringSeriesGoogleSync(coachId)
  console.log(JSON.stringify({ coachId, ...result }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
