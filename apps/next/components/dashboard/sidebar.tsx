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
}: {
  href: string
  label: string
  icon: NavItem['icon']
  active: boolean
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
      {label}
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
}: {
  group: NavGroup
  pathname: string
}) {
  const hasActiveItem = groupHasActiveItem(pathname, group)
  const [open, setOpen] = useState(true)
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
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-full w-[260px] shrink-0 flex-col border-r md:flex">
      <div className="flex h-16 items-center px-5">
        <BrandLogo />
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-6">
        <div className="space-y-0.5">
          {topNavItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isNavItemActive(pathname, item.href)}
            />
          ))}
          {navGroups.map((group) => (
            <NavGroupSection key={group.label} group={group} pathname={pathname} />
          ))}
        </div>
      </nav>
    </aside>
  )
}
