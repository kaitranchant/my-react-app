'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import { buildLeaderboardMetricHref } from '@/lib/leaderboard-page-data'
import { cn } from '@/lib/utils'
import {
  LEADERBOARD_METRICS,
  getLeaderboardMetricConfig,
} from '@/lib/leaderboard'
import { parseLeaderboardMetric } from '@/lib/validations/leaderboard'

export function LeaderboardCategoryTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
      <div className="flex w-max gap-2 sm:grid sm:w-full sm:grid-cols-3 lg:grid-cols-6">
        {LEADERBOARD_METRICS.map((entry) => {
          const Icon = entry.icon
          const active = metric === entry.id
          const href = buildLeaderboardMetricHref(pathname, searchParams, entry.id)

          return (
            <Link
              key={entry.id}
              href={href}
              className={cn(
                'w-[10.25rem] shrink-0 rounded-xl border p-2.5 text-left transition-colors sm:w-auto',
                active
                  ? 'border-brand bg-brand text-brand-foreground shadow-sm'
                  : 'bg-card hover:border-brand/30 hover:bg-muted/30'
              )}
            >
            <div className="mb-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
                  active
                    ? 'bg-brand-foreground/15 text-brand-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span
                className={cn(
                  'text-xs leading-tight',
                  active ? 'font-semibold' : 'font-medium'
                )}
              >
                {entry.shortLabel}
              </span>
            </div>
            <p
              className={cn(
                'line-clamp-3 text-[11px] leading-snug',
                active ? 'text-brand-foreground/80' : 'text-muted-foreground'
              )}
            >
              {entry.description}
            </p>
          </Link>
        )
      })}
      </div>
    </div>
  )
}

export function LeaderboardCategoryDescription() {
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)
  const config = getLeaderboardMetricConfig(metric)

  return (
    <p className="text-muted-foreground text-sm leading-relaxed">
      {config.description}
    </p>
  )
}
