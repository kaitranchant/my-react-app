'use client'

import { BrandLogo } from '@/components/dashboard/brand-logo'
import { PortalNavContent } from '@/components/portal/portal-nav-content'

type PortalSidebarProps = {
  showTeamNav?: boolean
}

export function PortalSidebar({ showTeamNav = false }: PortalSidebarProps) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="flex h-16 shrink-0 items-center px-5">
        <BrandLogo />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-6">
        <PortalNavContent showTeamNav={showTeamNav} />
      </nav>
    </aside>
  )
}
