import { cn } from '@/lib/utils'
import { formatMetricValue, type LoadMetric, type WeeklyMetricBucket } from '@/lib/load-analytics'
import type { WeightUnit } from 'app/types/database'

type VolumeBarChartProps = {
  buckets: WeeklyMetricBucket[]
  metric?: LoadMetric
  weightUnit?: WeightUnit
  className?: string
}

export function VolumeBarChart({
  buckets,
  metric = 'tonnage',
  weightUnit = 'lbs',
  className,
}: VolumeBarChartProps) {
  const maxValue = Math.max(...buckets.map((bucket) => bucket.value), 1)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex h-40 items-end gap-2">
        {buckets.map((bucket) => {
          const height = Math.max(8, Math.round((bucket.value / maxValue) * 100))
          const label = new Date(`${bucket.weekStart}T12:00:00`).toLocaleDateString(
            'en-US',
            { month: 'short', day: 'numeric' }
          )

          return (
            <div
              key={bucket.weekStart}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-muted-foreground text-[10px]">
                {bucket.value > 0
                  ? formatMetricValue(metric, bucket.value, weightUnit)
                  : '—'}
              </span>
              <div
                className="bg-brand/80 w-full rounded-t-md transition-all"
                style={{ height: `${height}%` }}
                title={`${label}: ${formatMetricValue(metric, bucket.value, weightUnit)}`}
              />
              <span className="text-muted-foreground truncate text-[10px]">
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
