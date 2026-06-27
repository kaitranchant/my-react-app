'use client'

import { useEffect, useState } from 'react'
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
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  topNavItems,
  type NavGroup,
  type NavItem,
} from '@/components/dashboard/nav'
import { getFilteredNavGroups } from '@/lib/dashboard-mobile-nav'
import type { CoachNavBadges } from '@/lib/dashboard-queries'

function formatNavBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count)
}

function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function groupHasActiveItem(pathname: string, group: NavGroup) {
  return group.items.some((item) => isNavItemActive(pathname, item.href))
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badgeCount = 0,
  onNavigate,
}: {
  href: string
  label: string
  icon: NavItem['icon']
  active: boolean
  badgeCount?: number
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
            className="bg-destructive absolute -top-0.5 -right-0.5 size-2 rounded-full"
            aria-hidden
          />
        ) : null}
      </span>
      {expanded ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badgeCount > 0 ? (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 justify-center px-1.5 text-[10px] font-semibold"
            >
              {formatNavBadgeCount(badgeCount)}
            </Badge>
          ) : null}
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
  icon: NavItem['icon']
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
  badgeByHref,
  onNavigate,
  forceOpen = false,
}: {
  group: NavGroup
  pathname: string
  badgeByHref: Record<string, number>
  onNavigate?: () => void
  forceOpen?: boolean
}) {
  const { expanded } = useSidebarExpand()
  const hasActiveItem = groupHasActiveItem(pathname, group)
  const [open, setOpen] = useState(hasActiveItem || forceOpen)
  const GroupIcon = group.icon

  useEffect(() => {
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
              active={isNavItemActive(pathname, item.href)}
              badgeCount={badgeByHref[item.href] ?? 0}
              onNavigate={onNavigate}
            />
          )
        })}
      </div>
    </div>
  )
}

type DashboardNavContentProps = {
  badges?: CoachNavBadges
  onNavigate?: () => void
  className?: string
}

export function DashboardNavContent({
  badges,
  onNavigate,
  className,
}: DashboardNavContentProps) {
  const pathname = usePathname()
  const badgeByHref: Record<string, number> = {
    '/messages': badges?.inboxUnread ?? 0,
    '/form-review': badges?.pendingFormReviews ?? 0,
    '/progressive-overload': badges?.pendingProgressiveOverload ?? 0,
  }

  return (
    <nav className={cn('space-y-0.5', className)}>
      {topNavItems.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={isNavItemActive(pathname, item.href)}
          badgeCount={badgeByHref[item.href] ?? 0}
          onNavigate={onNavigate}
        />
      ))}
      {getFilteredNavGroups().map((group) => (
        <NavGroupSection
          key={group.label}
          group={group}
          pathname={pathname}
          badgeByHref={badgeByHref}
          onNavigate={onNavigate}
          forceOpen={Boolean(onNavigate)}
        />
      ))}
    </nav>
  )
}
