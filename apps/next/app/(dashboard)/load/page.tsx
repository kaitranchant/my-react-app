import { Suspense } from 'react'

import { ScopeTabsSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { AttendanceScopeTabs } from '@/components/attendance/attendance-scope-tabs'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import { PageHeader } from '@/components/dashboard/page-header'
import { LoadDashboard } from '@/components/load/load-dashboard'
import {
  fetchAttendanceClients,
  fetchCoachTeams,
  parseAttendanceScope,
} from '@/lib/attendance'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { fetchCoachLoadSummaries } from '@/lib/load-queries'
import { getGymsForCoach } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Load Management — Coaching App',
}

export default async function LoadPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; scope?: string; team?: string }>
}) {
  const {
    client: initialClientId,
    scope: scopeParam,
    team: teamParam,
  } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : null

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

  const summaries = await fetchCoachLoadSummaries(
    supabase,
    clients.map((client) => ({
      id: client.id,
      full_name: client.full_name,
      avatar_url: client.avatar_url,
    }))
  )

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title="Load Management"
        description="Monitor training load, ACWR risk, session compliance, and readiness across your roster."
      />

      <Suspense fallback={<ScopeTabsSkeleton />}>
        <PageFilterPersistence
          pageKey="load"
          filterKeys={['scope', 'team']}
        />
        <div className="space-y-3">
          <AttendanceScopeTabs
            gyms={coachGyms.map((gym) => ({ id: gym.id, name: gym.name }))}
            teams={coachTeams}
          />
          <ClearPageFilters pageKey="load" filterKeys={['scope', 'team']} />
        </div>
      </Suspense>

      <LoadDashboard
        summaries={summaries}
        initialClientId={initialClientId ?? null}
        weightUnit={coachPreferences?.weightUnit ?? 'lbs'}
      />
    </div>
  )
}
