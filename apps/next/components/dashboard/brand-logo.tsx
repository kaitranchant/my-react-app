import { WingMark } from '@/components/brand/wing-mark'
import { cn } from '@/lib/utils'

export function BrandLogo({
  className,
  showText = true,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={cn('font-sans flex items-center gap-2.5', className)}>
      <WingMark className="h-5 w-8 shrink-0 -translate-y-[3px]" />
      {showText && (
        <span className="text-sm font-bold tracking-tight leading-none">
          <span className="text-foreground">Swift</span>
          <span className="text-brand">Coach</span>
        </span>
      )}
    </div>
  )
}
