import { cn } from '@/lib/utils'
import type { WeeklyMetricBucket } from '@/lib/load-analytics'

type LoadSparklineProps = {
  buckets: WeeklyMetricBucket[]
  className?: string
}

export function LoadSparkline({ buckets, className }: LoadSparklineProps) {
  const maxValue = Math.max(...buckets.map((bucket) => bucket.value), 1)

  return (
    <div
      className={cn('flex h-8 items-end gap-0.5', className)}
      aria-hidden
    >
      {buckets.slice(-8).map((bucket) => {
        const height = Math.max(
          2,
          Math.round((bucket.value / maxValue) * 100)
        )
        return (
          <span
            key={bucket.weekStart}
            className="bg-brand/70 w-1.5 rounded-sm"
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}
