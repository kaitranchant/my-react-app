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
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-8',
        className
      )}
    >
      <div className="from-brand/8 to-brand/3 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="page-title">{title}</h1>
          {description && (
            <p className="helper-text max-w-xl leading-relaxed">{description}</p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        )}
      </div>
    </section>
  )
}
