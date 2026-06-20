'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { getPortalNavItems } from '@/components/portal/portal-nav'
import { cn } from '@/lib/utils'

type PortalMobileNavProps = {
  showTeamNav?: boolean
}

export function PortalMobileNav({ showTeamNav = false }: PortalMobileNavProps) {
  const pathname = usePathname()
  const portalNavItems = getPortalNavItems(showTeamNav)
  const colCount = portalNavItems.length

  return (
    <nav className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden">
      <div
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
      >
        {portalNavItems.map((item) => {
          const Icon = item.icon
          const active =
            item.href === '/portal'
              ? pathname === '/portal'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors',
                active
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('size-5', active && 'text-brand')} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
