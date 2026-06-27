'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import { useSidebarExpand } from '@/components/layout/sidebar-expand-context'
import {
  sidebarGroupButtonClass,
  sidebarIconSlotClass,
  sidebarNavLinkClass,
  sidebarSubmenuClass,
} from '@/components/layout/sidebar-nav-styles'
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
  const { expanded, collapse } = useSidebarExpand()

  return (
    <Link
      href={href}
      title={label}
      onClick={() => {
        onNavigate?.()
        collapse()
      }}
      className={sidebarNavLinkClass(active, expanded)}
    >
      <span className={sidebarIconSlotClass}>
        <Icon className={cn('size-[18px]', active && 'text-brand')} />
        {!expanded && badgeCount > 0 ? (
          <span
            className="bg-brand absolute -top-0.5 -right-0.5 size-2 rounded-full"
            aria-hidden
          />
        ) : null}
      </span>
      {expanded ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <PortalNavBadge count={badgeCount} />
        </>
      ) : null}
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
  const { expanded } = useSidebarExpand()

  return (
    <span
      title={label}
      className={cn(
        sidebarNavLinkClass(false, expanded),
        'text-muted-foreground/40 cursor-not-allowed'
      )}
      aria-disabled
    >
      <span className={sidebarIconSlotClass}>
        <Icon className="size-[18px]" />
      </span>
      {expanded ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <Badge
            variant="outline"
            className="text-muted-foreground/60 border-border/60 text-[10px] font-normal"
          >
            Soon
          </Badge>
        </>
      ) : null}
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
  const { expanded } = useSidebarExpand()
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
        title={group.label}
        aria-expanded={open}
        onClick={() => {
          if (expanded) {
            setOpen((current) => !current)
          }
        }}
        className={sidebarGroupButtonClass(hasActiveItem, expanded)}
      >
        <span className={sidebarIconSlotClass}>
          <GroupIcon className={cn('size-[18px]', hasActiveItem && 'text-brand')} />
        </span>
        {expanded ? (
          <>
            <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
            <ChevronDown
              className={cn(
                'size-4 shrink-0 transition-transform duration-200',
                open && 'rotate-180'
              )}
            />
          </>
        ) : null}
      </button>

      <div className={sidebarSubmenuClass(open, expanded)}>
        {group.items.map((item) => {
          if (item.soon) {
            return (
              <NavSoonItem key={item.href} label={item.label} icon={item.icon} />
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
