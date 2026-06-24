'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'

type RouteErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
}

export function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  description = 'This page hit an unexpected error. You can try again or navigate elsewhere.',
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <div className="max-w-md space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
