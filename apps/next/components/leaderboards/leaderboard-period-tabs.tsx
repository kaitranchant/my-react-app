'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { FilterPills } from '@/components/ui/filter-pills'
import { LEADERBOARD_PERIODS } from '@/lib/leaderboard'
import {
  parseLeaderboardMetric,
  parseLeaderboardPeriod,
} from '@/lib/validations/leaderboard'
import { getLeaderboardMetricConfig } from '@/lib/leaderboard'

export function LeaderboardPeriodTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)
  const metricConfig = getLeaderboardMetricConfig(metric)

  if (!metricConfig.supportsPeriod) {
    return null
  }

  const period = parseLeaderboardPeriod(
    searchParams.get('period') ?? undefined,
    metric
  )

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'month') {
      params.delete('period')
    } else {
      params.set('period', value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <FilterPills
      label="Time period"
      value={period}
      onChange={handleChange}
      size="sm"
      options={LEADERBOARD_PERIODS.map((entry) => ({
        value: entry.id,
        label: entry.label,
      }))}
    />
  )
}
