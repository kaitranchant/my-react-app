import {
  CalendarCheck,
  CalendarDays,
  Flag,
  LayoutDashboard,
  MessageSquare,
  Scale,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type PortalNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const portalTeamNavItem: PortalNavItem = {
  label: 'Team',
  href: '/portal/team',
  icon: Flag,
}

export const portalBaseNavItems: PortalNavItem[] = [
  { label: 'Home', href: '/portal', icon: LayoutDashboard },
  { label: 'Workouts', href: '/portal/workouts', icon: CalendarDays },
  { label: 'Check-in', href: '/portal/check-in', icon: CalendarCheck },
  { label: 'Messages', href: '/portal/messages', icon: MessageSquare },
  { label: 'InBody', href: '/portal/inbody', icon: Scale },
  { label: 'Progress', href: '/portal/progress', icon: TrendingUp },
]

export function getPortalNavItems(showTeam: boolean): PortalNavItem[] {
  if (!showTeam) return portalBaseNavItems
  return [
    portalBaseNavItems[0],
    portalTeamNavItem,
    ...portalBaseNavItems.slice(1),
  ]
}

/** @deprecated Use getPortalNavItems(showTeam) from layout instead */
export const portalNavItems: PortalNavItem[] = portalBaseNavItems
