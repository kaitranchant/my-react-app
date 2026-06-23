import Link from 'next/link'

import { ClientAvatar } from '@/components/clients/client-avatar'
import { cn } from '@/lib/utils'

type PersonRowProps = {
  name: string
  avatarUrl?: string | null
  href?: string
  meta?: React.ReactNode
  badges?: React.ReactNode
  trailing?: React.ReactNode
  /** Stack trailing controls below the person info on small screens. */
  stackTrailingOnMobile?: boolean
  className?: string
  trailingClassName?: string
  as?: 'div' | 'li'
  stopLinkPropagation?: boolean
}

export function PersonRow({
  name,
  avatarUrl,
  href,
  meta,
  badges,
  trailing,
  stackTrailingOnMobile = false,
  className,
  trailingClassName,
  as: Component = 'div',
  stopLinkPropagation = false,
}: PersonRowProps) {
  const nameContent = href ? (
    <Link
      href={href}
      className="truncate font-medium transition-colors hover:text-brand"
      onClick={stopLinkPropagation ? (event) => event.stopPropagation() : undefined}
    >
      {name}
    </Link>
  ) : (
    <span className="truncate font-medium">{name}</span>
  )

  return (
    <Component
      className={cn(
        'flex min-w-0 gap-3',
        stackTrailingOnMobile
          ? 'flex-col sm:flex-row sm:items-start sm:justify-between'
          : 'items-start justify-between',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ClientAvatar
          name={name}
          avatarUrl={avatarUrl}
          size="sm"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {nameContent}
            {badges}
          </div>
          {meta ? (
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {meta}
            </div>
          ) : null}
        </div>
      </div>
      {trailing ? (
        <div
          className={cn(
            'flex items-center gap-2',
            stackTrailingOnMobile
              ? 'w-full flex-wrap sm:w-auto sm:shrink-0'
              : 'shrink-0',
            trailingClassName
          )}
        >
          {trailing}
        </div>
      ) : null}
    </Component>
  )
}
