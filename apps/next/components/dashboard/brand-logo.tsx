import { BirdMark } from '@/components/brand/bird-mark'
import { cn } from '@/lib/utils'

export function BrandLogo({
  className,
  markClassName,
  showText = false,
  textClassName,
}: {
  className?: string
  markClassName?: string
  showText?: boolean
  textClassName?: string
}) {
  return (
    <div className={cn('font-sans flex items-center gap-2.5', className)}>
      <BirdMark className={cn('h-7 w-8 shrink-0', markClassName)} />
      {showText && (
        <span
          className={cn(
            'text-sm font-bold tracking-tight leading-none whitespace-nowrap',
            textClassName
          )}
        >
          <span className="text-foreground">Swift</span>
          <span className="text-brand">Coach</span>
        </span>
      )}
    </div>
  )
}
