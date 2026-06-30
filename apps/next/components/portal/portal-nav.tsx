import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Dumbbell,
  Flag,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  CreditCard,
  Scale,
  Target,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
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

export type PortalNavGroup = {
  label: string
  icon: LucideIcon
  items: PortalNavItem[]
}

export type PortalNavLayout = {
  topItems: PortalNavItem[]
  groups: PortalNavGroup[]
  footerItems: PortalNavItem[]
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

const portalBillingNavItem: PortalNavItem = {
  label: 'Billing',
  href: '/portal/billing',
  icon: CreditCard,
}

const portalDashboardNavItem: PortalNavItem = {
  label: 'Dashboard',
  href: '/portal',
  icon: LayoutDashboard,
}

const portalMessagesNavItem: PortalNavItem = {
  label: 'Messages',
  href: '/portal/messages',
  icon: MessageSquare,
}

const portalTrainNavItems: PortalNavItem[] = [
  { label: 'Workouts', href: '/portal/workouts', icon: CalendarDays },
  { label: 'Sessions', href: '/portal/sessions', icon: CalendarClock },
  { label: 'Form Review', href: '/portal/form-review', icon: Video },
]

const portalTrackNavItems: PortalNavItem[] = [
  { label: 'Goals', href: '/portal/goals', icon: Target },
  { label: 'Check-in', href: '/portal/check-in', icon: CalendarCheck },
  { label: 'Nutrition', href: '/portal/nutrition', icon: UtensilsCrossed },
  { label: 'InBody', href: '/portal/inbody', icon: Scale },
  { label: 'Progress', href: '/portal/progress', icon: TrendingUp },
]

function getTrainNavItems(): PortalNavItem[] {
  if (!shouldShowWearablesNav()) {
    return portalTrainNavItems
  }

  return [
    ...portalTrainNavItems,
    { label: 'Wearables', href: '/portal/wearables', icon: Watch },
  ]
}

export function getPortalNavLayout(showTeam: boolean): PortalNavLayout {
  return {
    topItems: [portalDashboardNavItem],
    groups: [
      {
        label: 'Train',
        icon: Dumbbell,
        items: getTrainNavItems(),
      },
      {
        label: 'Track',
        icon: LineChart,
        items: portalTrackNavItems,
      },
    ],
    footerItems: [
      portalMessagesNavItem,
      portalBillingNavItem,
      ...(showTeam ? [portalTeamNavItem, portalLeaderboardsNavItem] : []),
    ],
  }
}

export function flattenPortalNavItems(layout: PortalNavLayout): PortalNavItem[] {
  return [
    ...layout.topItems,
    ...layout.groups.flatMap((group) => group.items),
    ...layout.footerItems,
  ]
}

/** @deprecated Use getPortalNavLayout(showTeam) instead */
export const portalBaseNavItems: PortalNavItem[] = flattenPortalNavItems(
  getPortalNavLayout(false)
)

export function getPortalNavItems(showTeam: boolean): PortalNavItem[] {
  return flattenPortalNavItems(getPortalNavLayout(showTeam))
}

const portalPrimaryMobileHrefs = new Set([
  '/portal',
  '/portal/messages',
  '/portal/workouts',
  '/portal/sessions',
])

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

export function getPortalOverflowMobileNavGroups(
  showTeam: boolean
): PortalNavGroup[] {
  const layout = getPortalNavLayout(showTeam)
  const overflowHrefs = new Set(
    getPortalOverflowMobileNavItems(showTeam).map((item) => item.href)
  )

  const groups = layout.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => overflowHrefs.has(item.href)),
    }))
    .filter((group) => group.items.length > 0)

  const footerItems = layout.footerItems.filter((item) =>
    overflowHrefs.has(item.href)
  )

  if (footerItems.length > 0) {
    groups.push({
      label: 'Team',
      icon: Flag,
      items: footerItems,
    })
  }

  return groups
}

/** @deprecated Use getPortalNavItems(showTeam) from layout instead */
export const portalNavItems: PortalNavItem[] = getPortalNavItems(false)

export function isPortalNavItemActive(pathname: string, href: string): boolean {
  if (href === '/portal') {
    return pathname === '/portal'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}
