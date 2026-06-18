'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { navItems, type NavItem } from '@/components/dashboard/nav'

const coreItems = navItems.filter((item) => !item.soon)
const soonItems = navItems.filter((item) => item.soon)

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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-[260px] shrink-0 flex-col border-r md:flex">
      <div className="flex h-16 items-center px-5">
        <BrandLogo />
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-6">
        <div className="space-y-0.5">
          {coreItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
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

        <div className="space-y-0.5">
          <p className="text-muted-foreground mb-2 px-3 text-xs font-medium">
            Coming soon
          </p>
          {soonItems.map((item) => {
            const Icon = item.icon
            return (
              <span
                key={item.href}
                className="text-muted-foreground/40 flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm"
                aria-disabled
              >
                <Icon className="size-[18px]" />
                <span className="flex-1">{item.label}</span>
                <Badge
                  variant="outline"
                  className="text-muted-foreground/60 border-border/60 text-[10px] font-normal"
                >
                  Soon
                </Badge>
              </span>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
