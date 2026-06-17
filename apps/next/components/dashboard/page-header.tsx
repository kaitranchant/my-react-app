import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-4',
        className
      )}
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight uppercase">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}
