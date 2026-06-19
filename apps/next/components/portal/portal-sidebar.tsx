'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { BrandLogo } from '@/components/dashboard/brand-logo'
import { portalNavItems, type PortalNavItem } from '@/components/portal/portal-nav'
import { cn } from '@/lib/utils'

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: PortalNavItem['icon']
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

export function PortalSidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-full w-[260px] shrink-0 flex-col border-r md:flex">
      <div className="flex h-16 items-center px-5">
        <BrandLogo />
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6">
        <div className="space-y-0.5">
          {portalNavItems.map((item) => {
            const active =
              item.href === '/portal'
                ? pathname === '/portal'
                : pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
              />
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
