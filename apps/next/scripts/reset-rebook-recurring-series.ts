/**
 * Tear down active recurring series for a coach and rebook them cleanly.
 *
 * Run: npx tsx scripts/reset-rebook-recurring-series.ts
 * Optional: COACH_ID=uuid npx tsx scripts/reset-rebook-recurring-series.ts --preview
 */
import {
  previewActiveRecurringSeries,
  resetAndRebookCoachRecurringSeries,
} from '../lib/scheduling/coach-series-reset'
import loadEnvLocal from './load-env-local.mjs'

loadEnvLocal()

async function main() {
  const previewOnly = process.argv.includes('--preview')
  const coachId = process.env.COACH_ID?.trim() || undefined

  if (previewOnly) {
    const snapshots = await previewActiveRecurringSeries(coachId)
    console.log(JSON.stringify(snapshots, null, 2))
    return
  }

  const result = await resetAndRebookCoachRecurringSeries(coachId)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
