import { Dumbbell } from 'lucide-react'

import { cn } from '@/lib/utils'

export function BrandLogo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-sm">
        <Dumbbell className="size-[18px]" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className="text-sm font-bold tracking-tight uppercase">
          Coaching
        </span>
      )}
    </div>
  )
}
