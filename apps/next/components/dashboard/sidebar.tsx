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
        'relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-accent font-semibold text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {active && (
        <span className="bg-brand absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2" />
      )}
      <Icon className={cn('size-4', active && 'text-foreground')} />
      {label}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-16 items-center border-b px-5">
        <BrandLogo />
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <div className="space-y-1">
          <p className="text-muted-foreground mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] uppercase">
            Main
          </p>
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

        <div className="space-y-1">
          <p className="text-muted-foreground mb-2 px-3 text-[10px] font-semibold tracking-[0.12em] uppercase">
            Coming soon
          </p>
          {soonItems.map((item) => {
            const Icon = item.icon
            return (
              <span
                key={item.href}
                className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-3 rounded-sm px-3 py-2.5 text-sm"
                aria-disabled
              >
                <Icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-border/80 text-[10px] font-normal"
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
