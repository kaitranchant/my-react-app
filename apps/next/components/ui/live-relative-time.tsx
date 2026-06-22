'use client'

import * as React from 'react'

import { formatRelativeTime } from '@/lib/dashboard'
import { cn } from '@/lib/utils'

type LiveRelativeTimeProps = {
  iso: string
  className?: string
}

export function LiveRelativeTime({ iso, className }: LiveRelativeTimeProps) {
  const [, setTick] = React.useState(0)

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((tick) => tick + 1)
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <span className={cn(className)} suppressHydrationWarning>
      {formatRelativeTime(iso)}
    </span>
  )
}
