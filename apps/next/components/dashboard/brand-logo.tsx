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
      <div className="bg-brand text-brand-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-4"
          aria-hidden
        >
          <path
            d="M6 17c0-2.5 2-4.5 6-4.5s6 2 6 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
          <path
            d="M4 20h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Coaching
          </span>
          <span className="text-muted-foreground text-[10px] font-medium leading-none">
            Coach platform
          </span>
        </div>
      )}
    </div>
  )
}
