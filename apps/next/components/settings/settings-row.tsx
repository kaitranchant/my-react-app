import { cn } from '@/lib/utils'

export function SettingsRow({
  label,
  description,
  children,
  className,
}: {
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b py-4 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="space-y-0.5 sm:max-w-md">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
