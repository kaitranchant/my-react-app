import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

import { Button } from '@/components/ui/button'

type RouteNotFoundProps = {
  homeHref: string
  homeLabel: string
  title?: string
  description?: string
}

export function RouteNotFound({
  homeHref,
  homeLabel,
  title = 'Page not found',
  description = "This page doesn't exist or may have been moved.",
}: RouteNotFoundProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="empty-state-icon">
        <FileQuestion className="size-7" />
      </div>
      <div className="max-w-md space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <Button asChild variant="brand">
        <Link href={homeHref}>{homeLabel}</Link>
      </Button>
    </div>
  )
}
