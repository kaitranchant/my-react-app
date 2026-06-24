'use client'

import { RouteError } from '@/components/route-error'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Dashboard unavailable"
      description="We couldn't load this dashboard page. Try again or use the sidebar to go somewhere else."
    />
  )
}
