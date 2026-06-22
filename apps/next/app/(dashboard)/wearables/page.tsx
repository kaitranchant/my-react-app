import { Suspense } from 'react'

import { AttendanceScopeTabs } from '@/components/attendance/attendance-scope-tabs'
import { PageHeader } from '@/components/dashboard/page-header'
import { WearablesRosterTable } from '@/components/wearables/wearables-roster-table'
import {
  fetchAttendanceClients,
  fetchCoachTeams,
  parseAttendanceScope,
} from '@/lib/attendance'
import { getGymsForCoach } from '@/lib/gym-access'
import { fetchCoachWearableRoster } from '@/lib/wearable-queries'
import { WearablesComingSoon } from '@/components/wearables/wearables-coming-soon'
import { areWearablesLive } from '@/lib/wearables-feature'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Wearables — Coaching App',
}

export default async function WearablesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; team?: string }>
}) {
  if (!areWearablesLive()) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Wearables"
          description="Monitor sleep, HRV, recovery, and activity synced from athlete wearables."
        />
        <WearablesComingSoon audience="coach" />
      </div>
    )
  }

  const { scope: scopeParam, team: teamParam } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const coachTeams = user ? await fetchCoachTeams(supabase, user.id) : []
  const scope = parseAttendanceScope(
    scopeParam,
    teamParam,
    coachGymIds,
    coachGyms,
    coachTeams
  )

  const clients = user
    ? await fetchAttendanceClients(supabase, {
        scope,
        coachGymIds,
        userId: user.id,
      })
    : []

  const rows = await fetchCoachWearableRoster(supabase, clients)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Wearables"
        description="Monitor sleep, HRV, recovery, and activity synced from athlete wearables."
      />

      <Suspense fallback={null}>
        <AttendanceScopeTabs gyms={coachGyms} teams={coachTeams} />
      </Suspense>

      <WearablesRosterTable rows={rows} />
    </div>
  )
}
