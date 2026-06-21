import { cn } from '@/lib/utils'

type LeaderboardSparklineProps = {
  values: number[]
  className?: string
}

export function LeaderboardSparkline({
  values,
  className,
}: LeaderboardSparklineProps) {
  if (values.length === 0 || values.every((value) => value <= 0)) {
    return null
  }

  const maxValue = Math.max(...values, 1)

  return (
    <div
      className={cn('flex h-7 items-end gap-0.5', className)}
      aria-hidden
      title="4-week e1RM trend"
    >
      {values.map((value, index) => {
        const height = Math.max(2, Math.round((value / maxValue) * 100))
        return (
          <span
            key={index}
            className="bg-brand/70 w-1.5 rounded-sm"
            style={{ height: `${height}%` }}
          />
        )
      })}
    </div>
  )
}
