'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

export type FilterPillLinkOption = {
  href: string
  label: string
  active?: boolean
}

type FilterPillLinksProps = {
  options: FilterPillLinkOption[]
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function FilterPillLinks({
  options,
  label,
  size = 'md',
  className,
}: FilterPillLinksProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </p>
      ) : null}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex w-max flex-wrap gap-1.5">
          {options.map((option) => (
            <Link
              key={option.href}
              href={option.href}
              className={cn(
                'filter-pill shrink-0',
                size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
                option.active
                  ? 'filter-pill-active'
                  : 'filter-pill-inactive'
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/** @deprecated Use FilterPillLinks — kept as alias for nav-style filter rows */
export function FilterNavPills({
  tabs,
}: {
  tabs: readonly { href: string; label: string }[]
}) {
  const pathname = usePathname()

  return (
    <FilterPillLinks
      options={tabs.map((tab) => ({
        href: tab.href,
        label: tab.label,
        active:
          pathname === tab.href || pathname.startsWith(`${tab.href}/`),
      }))}
    />
  )
}


export type FilterPillOption = {
  value: string
  label: string
  title?: string
}

type FilterPillsProps = {
  value: string
  onChange: (value: string) => void
  options: FilterPillOption[]
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function FilterPills({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: FilterPillsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </p>
      ) : null}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="inline-flex w-max flex-wrap gap-1.5">
          {options.map((option) => {
            const active = value === option.value

            return (
              <button
                key={option.value}
                type="button"
                title={option.title ?? option.label}
                onClick={() => onChange(option.value)}
                className={cn(
                  'filter-pill shrink-0',
                  size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
                  active ? 'filter-pill-active' : 'filter-pill-inactive'
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
