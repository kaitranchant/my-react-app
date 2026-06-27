'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'

import {
  getPortalOverflowMobileNavItems,
  getPortalPrimaryMobileNavItems,
  type PortalNavItem,
} from '@/components/portal/portal-nav'
import { PortalNavIconBadge } from '@/components/portal/portal-nav-badge'
import { usePortalNavBadges } from '@/components/portal/portal-nav-badges-provider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { resolvePortalNavBadgeCount } from '@/lib/portal-nav-badges'
import { cn } from '@/lib/utils'

type PortalMobileNavProps = {
  showTeamNav?: boolean
}

function isNavItemActive(pathname: string, href: string) {
  return href === '/portal'
    ? pathname === '/portal'
    : pathname === href || pathname.startsWith(`${href}/`)
}

function NavIcon({
  item,
  active,
  badgeCount,
}: {
  item: PortalNavItem
  active: boolean
  badgeCount: number
}) {
  const Icon = item.icon

  return (
    <span className="relative">
      <Icon className={cn('size-5', active && 'text-brand')} />
      <PortalNavIconBadge count={badgeCount} />
    </span>
  )
}

export function PortalMobileNav({ showTeamNav = false }: PortalMobileNavProps) {
  const pathname = usePathname()
  const badges = usePortalNavBadges()
  const [moreOpen, setMoreOpen] = useState(false)
  const primaryItems = getPortalPrimaryMobileNavItems(showTeamNav)
  const overflowItems = getPortalOverflowMobileNavItems(showTeamNav)
  const overflowActive = overflowItems.some((item) =>
    isNavItemActive(pathname, item.href)
  )
  const overflowBadgeCount = overflowItems.reduce(
    (total, item) =>
      total + resolvePortalNavBadgeCount(item.href, badges, pathname),
    0
  )

  return (
    <>
      <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {primaryItems.map((item) => {
            const active = isNavItemActive(pathname, item.href)
            const badgeCount = resolvePortalNavBadgeCount(item.href, badges, pathname)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors',
                  active
                    ? 'text-brand'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <NavIcon item={item} active={active} badgeCount={badgeCount} />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors',
              overflowActive || moreOpen
                ? 'text-brand'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="More navigation"
          >
            <span className="relative">
              <MoreHorizontal
                className={cn(
                  'size-5',
                  (overflowActive || moreOpen) && 'text-brand'
                )}
              />
              <PortalNavIconBadge count={overflowBadgeCount} />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[min(70vh,28rem)] gap-0 overflow-hidden rounded-t-xl px-0"
        >
          <SheetHeader className="border-b px-4 pb-3 text-left">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid max-h-[calc(min(70vh,28rem)-4.5rem)] grid-cols-2 gap-1 overflow-y-auto overscroll-y-contain p-2">
            {overflowItems.map((item) => {
              const Icon = item.icon
              const active = isNavItemActive(pathname, item.href)
              const badgeCount = resolvePortalNavBadgeCount(item.href, badges, pathname)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    'flex min-h-14 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand/10 text-brand'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className={cn('size-5', active && 'text-brand')} />
                    <PortalNavIconBadge count={badgeCount} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
