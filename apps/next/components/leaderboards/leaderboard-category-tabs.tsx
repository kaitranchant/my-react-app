'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { cn } from '@/lib/utils'
import {
  LEADERBOARD_METRICS,
  getLeaderboardMetricConfig,
} from '@/lib/leaderboard'
import {
  metricSupportsExercise,
  parseLeaderboardMetric,
} from '@/lib/validations/leaderboard'

export function LeaderboardCategoryTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const metric = parseLeaderboardMetric(searchParams.get('metric') ?? undefined)

  function handleChange(nextMetric: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('metric', nextMetric)

    if (!metricSupportsExercise(parseLeaderboardMetric(nextMetric))) {
      params.delete('exercise')
    }

    if (nextMetric !== 'relative_strength') {
      params.delete('formula')
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="grid grid-cols-6 gap-2">
      {LEADERBOARD_METRICS.map((entry) => {
        const Icon = entry.icon
        const active = metric === entry.id

        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => handleChange(entry.id)}
            className={cn(
              'min-w-0 rounded-xl border p-2.5 text-left transition-colors',
              active
                ? 'border-brand/40 bg-brand/5 shadow-sm'
                : 'bg-card hover:border-brand/20 hover:bg-muted/30'
            )}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
                  active
                    ? 'bg-brand/15 text-brand'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="text-xs font-semibold leading-tight">
                {entry.shortLabel}
              </span>
            </div>
            <p className="text-muted-foreground line-clamp-3 text-[11px] leading-snug">
              {entry.description}
            </p>
          </button>
        )
      })}
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
