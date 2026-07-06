import { Suspense } from 'react'

import { AttendanceScopeTabs } from '@/components/attendance/attendance-scope-tabs'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import { PageHeader } from '@/components/dashboard/page-header'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { LeaderboardCategoryTabs } from '@/components/leaderboards/leaderboard-category-tabs'
import { LeaderboardFormulaTabs } from '@/components/leaderboards/leaderboard-formula-tabs'
import { LeaderboardPeriodTabs } from '@/components/leaderboards/leaderboard-period-tabs'
import { LeaderboardResultsSkeleton } from '@/components/leaderboards/leaderboard-results-skeleton'
import { LeaderboardScopeContent } from '@/components/leaderboards/leaderboard-scope-content'
import { fetchCoachTeams } from '@/lib/attendance'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { leaderboardScopeSuspenseKey } from '@/lib/leaderboard-page-data'
import { getGymsForCoach } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionGate } from '@/lib/subscription-server'

export const metadata = {
  title: 'Leaderboards — Coaching App',
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string
    team?: string
    metric?: string
    period?: string
    exercise?: string
    formula?: string
    class?: string
  }>
}) {
  const gate = await getSubscriptionGate('leaderboards')
  if (!gate.allowed) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Leaderboards"
          description="Rank clients by strength, consistency, volume, and improvement."
        />
        <UpgradePrompt gate={gate} />
      </div>
    )
  }

  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const coachPreferences = await getCoachPreferencesForUser(user.id)
  const [coachGyms, coachTeams] = await Promise.all([
    getGymsForCoach(user.id),
    fetchCoachTeams(supabase, user.id),
  ])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Leaderboards"
        description="Rank athletes by strength PRs, Wilks/DOTS scores, consistency, volume, improvement, and training streaks."
      />

      <PageFilterPersistence
        pageKey="leaderboards"
        filterKeys={[
          'scope',
          'team',
          'metric',
          'period',
          'exercise',
          'formula',
          'class',
        ]}
        defaultValues={{ metric: 'strength', period: 'month', formula: 'dots' }}
      />
      <div className="space-y-3">
        <AttendanceScopeTabs gyms={coachGyms} teams={coachTeams} />
        <ClearPageFilters
          pageKey="leaderboards"
          filterKeys={[
            'scope',
            'team',
            'metric',
            'period',
            'exercise',
            'formula',
            'class',
          ]}
        />
      </div>

      <LeaderboardCategoryTabs />

      <LeaderboardPeriodTabs />

      <LeaderboardFormulaTabs />

      <Suspense
        key={leaderboardScopeSuspenseKey(resolvedSearchParams)}
        fallback={<LeaderboardResultsSkeleton />}
      >
        <LeaderboardScopeContent
          searchParams={resolvedSearchParams}
          userId={user.id}
          coachGyms={coachGyms}
          coachTeams={coachTeams}
          weekStartsOn={coachPreferences?.weekStartsOn ?? 'monday'}
          weightUnit={coachPreferences?.weightUnit ?? 'lbs'}
        />
      </Suspense>
    </div>
  )
}
