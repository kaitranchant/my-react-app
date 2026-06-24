'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  getPortalNavItems,
  type PortalNavItem,
} from '@/components/portal/portal-nav'
import { PortalNavBadge } from '@/components/portal/portal-nav-badge'
import { Badge } from '@/components/ui/badge'
import {
  emptyPortalNavBadges,
  getPortalNavBadgeCount,
  type PortalNavBadges,
} from '@/lib/portal-nav-badges'
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

type PortalNavContentProps = {
  showTeamNav?: boolean
  badges?: PortalNavBadges
  onNavigate?: () => void
  className?: string
}

export function PortalNavContent({
  showTeamNav = false,
  badges = emptyPortalNavBadges,
  onNavigate,
  className,
}: PortalNavContentProps) {
  const pathname = usePathname()
  const portalNavItems = getPortalNavItems(showTeamNav)

  return (
    <nav className={cn('space-y-0.5', className)}>
      {portalNavItems.map((item) => {
        const active =
          item.href === '/portal'
            ? pathname === '/portal'
            : pathname === item.href || pathname.startsWith(`${item.href}/`)

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
            active={active}
            badgeCount={getPortalNavBadgeCount(item.href, badges)}
            onNavigate={onNavigate}
          />
        )
      })}
    </nav>
  )
}
