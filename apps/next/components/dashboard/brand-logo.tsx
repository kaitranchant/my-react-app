import { WingMark } from '@/components/brand/wing-mark'
import { APP_TAGLINE } from '@/lib/brand'
import { cn } from '@/lib/utils'

export function BrandLogo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={cn('font-sans flex items-center gap-2.5 md:items-start', className)}>
      <WingMark className="size-7 shrink-0 md:mt-0.5" />
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight leading-tight">
            <span className="text-foreground">Swift</span>
            <span className="text-brand">Coach</span>
          </span>
          <span className="text-muted-foreground hidden text-[10px] font-medium uppercase tracking-wide md:block">
            {APP_TAGLINE}
          </span>
        </div>
      )}
    </div>
  )
}
