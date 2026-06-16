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
      <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
        <Dumbbell className="size-[18px]" strokeWidth={2.25} />
      </div>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight">
          Coaching App
        </span>
      )}
    </div>
  )
}
