'use client'

import * as React from 'react'
import { Timer } from 'lucide-react'

import { formatElapsedTime } from '@/lib/workout-log'
import { cn } from '@/lib/utils'

type WorkoutElapsedTimerProps = {
  startedAt: string | null
  active: boolean
  className?: string
}

export function WorkoutElapsedTimer({
  startedAt,
  active,
  className,
}: WorkoutElapsedTimerProps) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    if (!active || !startedAt) {
      setElapsed(0)
      return
    }

    const startMs = new Date(startedAt).getTime()

    function tick() {
      const next = Math.max(0, Math.floor((Date.now() - startMs) / 1000))
      setElapsed(next)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [active, startedAt])

  if (!active || !startedAt) return null

  return (
    <div
      className={cn(
        'bg-brand/10 text-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold tabular-nums',
        className
      )}
    >
      <Timer className="size-3.5" />
      {formatElapsedTime(elapsed)}
    </div>
  )
}

export function WorkoutProgressBar({
  completed,
  total,
  className,
}: {
  completed: number
  total: number
  className?: string
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-brand h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
