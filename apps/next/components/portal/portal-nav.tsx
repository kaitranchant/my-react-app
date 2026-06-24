import {
  CalendarCheck,
  CalendarDays,
  Flag,
  LayoutDashboard,
  MessageSquare,
  Scale,
  Target,
  TrendingUp,
  Trophy,
  Video,
  Watch,
  type LucideIcon,
} from 'lucide-react'

import { shouldShowWearablesNav } from '@/lib/wearables-feature'

export type PortalNavItem = {
  label: string
  href: string
  icon: LucideIcon
  soon?: boolean
}

export const portalTeamNavItem: PortalNavItem = {
  label: 'Team',
  href: '/portal/team',
  icon: Flag,
}

export const portalLeaderboardsNavItem: PortalNavItem = {
  label: 'Leaderboards',
  href: '/portal/leaderboards',
  icon: Trophy,
}

export const portalBaseNavItems: PortalNavItem[] = [
  { label: 'Home', href: '/portal', icon: LayoutDashboard },
  { label: 'Workouts', href: '/portal/workouts', icon: CalendarDays },
  { label: 'Form Review', href: '/portal/form-review', icon: Video },
  { label: 'Check-in', href: '/portal/check-in', icon: CalendarCheck },
  { label: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { label: 'InBody', href: '/portal/inbody', icon: Scale },
  { label: 'Goals', href: '/portal/goals', icon: Target },
  { label: 'Progress', href: '/portal/progress', icon: TrendingUp },
]

function getPortalBaseNavItems(): PortalNavItem[] {
  if (shouldShowWearablesNav()) {
    return [
      ...portalBaseNavItems.slice(0, 4),
      { label: 'Wearables', href: '/portal/wearables', icon: Watch },
      ...portalBaseNavItems.slice(4),
    ]
  }
  return portalBaseNavItems
}

const portalPrimaryMobileHrefs = new Set([
  '/portal',
  '/portal/workouts',
  '/portal/progress',
  '/portal/messages',
])

export function getPortalNavItems(showTeam: boolean): PortalNavItem[] {
  const baseItems = getPortalBaseNavItems()
  if (!showTeam) return baseItems
  return [
    baseItems[0],
    portalTeamNavItem,
    portalLeaderboardsNavItem,
    ...baseItems.slice(1),
  ]
}

export function getPortalPrimaryMobileNavItems(showTeam: boolean): PortalNavItem[] {
  return getPortalNavItems(showTeam).filter(
    (item) => portalPrimaryMobileHrefs.has(item.href) && !item.soon
  )
}

export function getPortalOverflowMobileNavItems(showTeam: boolean): PortalNavItem[] {
  return getPortalNavItems(showTeam).filter(
    (item) => !portalPrimaryMobileHrefs.has(item.href) && !item.soon
  )
}

/** @deprecated Use getPortalNavItems(showTeam) from layout instead */
export const portalNavItems: PortalNavItem[] = getPortalBaseNavItems()
