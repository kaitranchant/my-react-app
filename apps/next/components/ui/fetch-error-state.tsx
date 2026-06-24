'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FetchErrorStateProps = {
  title?: string
  description?: string
  className?: string
}

export function FetchErrorState({
  title = "Couldn't load this data",
  description = 'Something went wrong while fetching. Check your connection and try again.',
  className,
}: FetchErrorStateProps) {
  const router = useRouter()

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-6 py-12 text-center',
        className
      )}
    >
      <div className="empty-state-icon">
        <AlertTriangle className="size-7" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-1"
        onClick={() => router.refresh()}
      >
        Try again
      </Button>
    </div>
  )
}
