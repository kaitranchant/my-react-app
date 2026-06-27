'use client'

import { BrandLogo } from '@/components/dashboard/brand-logo'
import { DashboardNavContent } from '@/components/dashboard/dashboard-nav-content'
import {
  CollapsibleSidebar,
  useSidebarExpand,
} from '@/components/layout/collapsible-sidebar'

function SidebarHeader() {
  const { expanded } = useSidebarExpand()

  return <BrandLogo showText={expanded} />
}

export function Sidebar({ badges }: { badges?: import('@/lib/dashboard-queries').CoachNavBadges }) {
  return (
    <CollapsibleSidebar header={<SidebarHeader />}>
      <DashboardNavContent badges={badges} />
    </CollapsibleSidebar>
  )
}
