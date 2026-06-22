'use client'

import { BrandLogo } from '@/components/dashboard/brand-logo'
import { DashboardNavContent } from '@/components/dashboard/dashboard-nav-content'
import type { CoachNavBadges } from '@/lib/dashboard-queries'

export function Sidebar({ badges }: { badges?: CoachNavBadges }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="flex h-16 shrink-0 items-center px-5">
        <BrandLogo />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-6">
        <DashboardNavContent badges={badges} />
      </div>
    </aside>
  )
}
