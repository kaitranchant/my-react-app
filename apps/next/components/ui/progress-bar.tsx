import { cn } from '@/lib/utils'

type ProgressBarProps = {
  value: number
  className?: string
  barClassName?: string
}

export function ProgressBar({
  value,
  className,
  barClassName,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className={cn(
        'bg-muted h-1.5 overflow-hidden rounded-full',
        className
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'bg-brand h-full rounded-full transition-all duration-500 ease-out',
          barClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
