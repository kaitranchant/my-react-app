'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { BrandLogo } from '@/components/dashboard/brand-logo'
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
}: {
  href: string
  label: string
  icon: NavItem['icon']
  active: boolean
  badgeCount?: number
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
      className="text-muted-foreground/40 flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm"
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
}: {
  group: NavGroup
  pathname: string
  badgeByHref: Record<string, number>
}) {
  const hasActiveItem = groupHasActiveItem(pathname, group)
  const [open, setOpen] = useState(hasActiveItem)
  const GroupIcon = group.icon

  useEffect(() => {
    if (hasActiveItem) {
      setOpen(true)
    }
  }, [hasActiveItem, pathname])

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function Sidebar({ badges }: { badges?: CoachNavBadges }) {
  const pathname = usePathname()
  const badgeByHref: Record<string, number> = {
    '/messages': badges?.inboxUnread ?? 0,
    '/form-review': badges?.pendingFormReviews ?? 0,
  }

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="flex h-16 shrink-0 items-center px-5">
        <BrandLogo />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-6">
        <div className="space-y-0.5">
          {topNavItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isNavItemActive(pathname, item.href)}
              badgeCount={badgeByHref[item.href] ?? 0}
            />
          ))}
          {navGroups.map((group) => (
            <NavGroupSection
              key={group.label}
              group={group}
              pathname={pathname}
              badgeByHref={badgeByHref}
            />
          ))}
        </div>
      </nav>
    </aside>
  )
}
