import loadEnvLocal from './load-env-local.mjs'
import { repairCoachRecurringSeriesGoogleSync } from '../lib/google-calendar/repair-series-sync'

loadEnvLocal()

async function main() {
  const coachId =
    process.env.COACH_ID?.trim() || 'd18ca141-c03e-4477-857b-4ce509a4f695'
  const result = await repairCoachRecurringSeriesGoogleSync(coachId)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
