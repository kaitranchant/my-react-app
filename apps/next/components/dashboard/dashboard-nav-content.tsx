'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  navGroups,
  topNavItems,
  type NavGroup,
  type NavItem,
} from '@/components/dashboard/nav'
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
      <Icon className={cn('size-[18px]', active && 'text-brand')} />
      <span className="flex-1">{label}</span>
      {badgeCount > 0 ? (
        <Badge
          variant="destructive"
          className="h-5 min-w-5 justify-center px-1.5 text-[10px] font-semibold"
        >
          {formatNavBadgeCount(badgeCount)}
        </Badge>
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

      {open ? (
        <div className="border-border/60 ml-[18px] space-y-0.5 border-l pl-2">
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
                active={isNavItemActive(pathname, item.href)}
                badgeCount={badgeByHref[item.href] ?? 0}
                onNavigate={onNavigate}
              />
            )
          })}
        </div>
      ) : null}
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
      {navGroups.map((group) => (
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
