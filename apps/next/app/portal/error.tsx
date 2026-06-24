'use client'

import { RouteError } from '@/components/route-error'

export default function PortalError({
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
      title="Page unavailable"
      description="We couldn't load this page. Try again or use the menu to continue."
    />
  )
}
