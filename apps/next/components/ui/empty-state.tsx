import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EmptyStateAction = {
  label: string
  href?: string
  onClick?: () => void
}

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm',
        className
      )}
    >
      <div className="empty-state-icon">
        <Icon className="size-7" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed">{description}</p>
      </div>
      {action ? (
        action.href ? (
          <Button asChild size="sm" variant="brand" className="mt-1">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="brand"
            className="mt-1"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  )
}
