import { BirdMark } from '@/components/brand/bird-mark'
import { SwiftWordmark } from '@/components/brand/swift-wordmark'
import { cn } from '@/lib/utils'

export function BrandLogo({
  className,
  markClassName,
  showWordmark = false,
}: {
  className?: string
  markClassName?: string
  showWordmark?: boolean
}) {
  if (showWordmark) {
    return (
      <SwiftWordmark
        className={cn('h-7 w-auto -translate-y-1', className)}
      />
    )
  }

  return (
    <div className={cn('font-sans flex items-center', className)}>
      <BirdMark className={cn('h-7 w-8 shrink-0', markClassName)} />
    </div>
  )
}
