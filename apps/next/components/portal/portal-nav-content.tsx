'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import {
  getPortalNavLayout,
  isPortalNavItemActive,
  type PortalNavGroup,
  type PortalNavItem,
} from '@/components/portal/portal-nav'
import { PortalNavBadge } from '@/components/portal/portal-nav-badge'
import { usePortalNavBadges } from '@/components/portal/portal-nav-badges-provider'
import { Badge } from '@/components/ui/badge'
import { resolvePortalNavBadgeCount } from '@/lib/portal-nav-badges'
import { cn } from '@/lib/utils'

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badgeCount,
  onNavigate,
}: {
  href: string
  label: string
  icon: PortalNavItem['icon']
  active: boolean
  badgeCount: number
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-brand/10 text-brand font-semibold'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className={cn('size-[18px] shrink-0', active && 'text-brand')} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <PortalNavBadge count={badgeCount} />
    </Link>
  )
}

function NavSoonItem({
  label,
  icon: Icon,
}: {
  label: string
  icon: PortalNavItem['icon']
}) {
  return (
    <span
      className="text-muted-foreground/40 flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm"
      aria-disabled
    >
      <Icon className="size-[18px]" />
      <span className="flex-1">{label}</span>
      <Badge
        variant="outline"
        className="text-muted-foreground/60 border-border/60 text-[10px] font-normal"
      >
        Soon
      </Badge>
    </span>
  )
}

function NavGroupSection({
  group,
  pathname,
  onNavigate,
  forceOpen = false,
}: {
  group: PortalNavGroup
  pathname: string
  onNavigate?: () => void
  forceOpen?: boolean
}) {
  const badges = usePortalNavBadges()
  const hasActiveItem = group.items.some((item) =>
    isPortalNavItemActive(pathname, item.href)
  )
  const [open, setOpen] = React.useState(hasActiveItem || forceOpen)
  const GroupIcon = group.icon

  React.useEffect(() => {
    if (hasActiveItem || forceOpen) {
      setOpen(true)
    }
  }, [hasActiveItem, forceOpen, pathname])

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'text-muted-foreground hover:bg-muted hover:text-foreground flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          hasActiveItem && 'text-foreground'
        )}
      >
        <GroupIcon className="size-[18px]" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'border-border/60 ml-[18px] space-y-0.5 border-l pl-2 transition-opacity duration-200',
              open ? 'opacity-100' : 'opacity-0'
            )}
          >
            {group.items.map((item) => {
              if (item.soon) {
                return (
                  <NavSoonItem
                    key={item.href}
                    label={item.label}
                    icon={item.icon}
                  />
                )
              }

              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isPortalNavItemActive(pathname, item.href)}
                  badgeCount={resolvePortalNavBadgeCount(
                    item.href,
                    badges,
                    pathname
                  )}
                  onNavigate={onNavigate}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

type PortalNavContentProps = {
  showTeamNav?: boolean
  onNavigate?: () => void
  className?: string
}

export function PortalNavContent({
  showTeamNav = false,
  onNavigate,
  className,
}: PortalNavContentProps) {
  const pathname = usePathname()
  const badges = usePortalNavBadges()
  const layout = getPortalNavLayout(showTeamNav)

  return (
    <nav className={cn('space-y-0.5', className)}>
      {layout.topItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={isPortalNavItemActive(pathname, item.href)}
          badgeCount={resolvePortalNavBadgeCount(item.href, badges, pathname)}
          onNavigate={onNavigate}
        />
      ))}

      {layout.groups.map((group) => (
        <NavGroupSection
          key={group.label}
          group={group}
          pathname={pathname}
          onNavigate={onNavigate}
          forceOpen={Boolean(onNavigate)}
        />
      ))}

      {layout.footerItems.length > 0 ? (
        <div className="space-y-0.5 pt-2">
          {layout.footerItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isPortalNavItemActive(pathname, item.href)}
              badgeCount={resolvePortalNavBadgeCount(
                item.href,
                badges,
                pathname
              )}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </nav>
  )
}
