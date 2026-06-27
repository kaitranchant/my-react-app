'use client'

import { BrandLogo } from '@/components/dashboard/brand-logo'
import {
  CollapsibleSidebar,
  useSidebarExpand,
} from '@/components/layout/collapsible-sidebar'
import { PortalNavContent } from '@/components/portal/portal-nav-content'

function SidebarHeader() {
  const { expanded } = useSidebarExpand()

  return <BrandLogo showText={expanded} />
}

type PortalSidebarProps = {
  showTeamNav?: boolean
}

export function PortalSidebar({ showTeamNav = false }: PortalSidebarProps) {
  return (
    <CollapsibleSidebar header={<SidebarHeader />}>
      <PortalNavContent showTeamNav={showTeamNav} />
    </CollapsibleSidebar>
  )
}
