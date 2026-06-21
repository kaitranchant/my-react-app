'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        Time period
      </p>
      <Tabs value={period} onValueChange={handleChange} className="min-w-0">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="inline-flex h-9 w-max gap-1 bg-muted/50">
            {LEADERBOARD_PERIODS.map((entry) => (
              <TabsTrigger
                key={entry.id}
                value={entry.id}
                className="flex-none px-3 text-sm"
              >
                {entry.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
    </div>
  )
}
