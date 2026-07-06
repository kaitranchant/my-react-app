'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

import { buildLeaderboardPeriodHref } from '@/lib/leaderboard-page-data'
import { FilterPillLinks } from '@/components/ui/filter-pills'
import { LEADERBOARD_PERIODS } from '@/lib/leaderboard'
import {
  parseLeaderboardMetric,
  parseLeaderboardPeriod,
} from '@/lib/validations/leaderboard'
import { getLeaderboardMetricConfig } from '@/lib/leaderboard'

export function LeaderboardPeriodTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)
  const metricConfig = getLeaderboardMetricConfig(metric)

  const period = parseLeaderboardPeriod(
    searchParams.get('period') ?? undefined,
    metric
  )

  const options = useMemo(
    () =>
      LEADERBOARD_PERIODS.map((entry) => ({
        href: buildLeaderboardPeriodHref(pathname, searchParams, entry.id),
        label: entry.label,
        active: period === entry.id,
      })),
    [pathname, period, searchParams]
  )

  if (!metricConfig.supportsPeriod) {
    return null
  }

  return <FilterPillLinks label="Time period" size="sm" options={options} />
}
