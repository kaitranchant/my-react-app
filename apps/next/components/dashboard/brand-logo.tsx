import { BirdMark } from '@/components/brand/bird-mark'
import { cn } from '@/lib/utils'

export function BrandLogo({
  className,
  showText = false,
}: {
  className?: string
  showText?: boolean
}) {
  return (
    <div className={cn('font-sans flex items-center gap-2.5', className)}>
      <BirdMark className="h-7 w-8 shrink-0" />
      {showText && (
        <span className="text-sm font-bold tracking-tight leading-none">
          <span className="text-foreground">Swift</span>
          <span className="text-brand">Coach</span>
        </span>
      )}
    </div>
  )
}
