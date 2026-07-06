import { cn } from '@/lib/utils'

export function SettingsSubsection({
  title,
  description,
  variant = 'default',
  children,
  className,
}: {
  title: string
  description?: string
  variant?: 'default' | 'panel'
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        variant === 'panel' &&
          'bg-muted/30 mt-8 rounded-xl border px-4 py-5 sm:px-5',
        className
      )}
    >
      <div
        className={cn(
          'space-y-1',
          variant === 'default' ? 'mb-1' : 'border-border/60 mb-4 border-b pb-4'
        )}
      >
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}
