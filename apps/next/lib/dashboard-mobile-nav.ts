import {
  navGroups,
  topNavItems,
  type NavGroup,
  type NavItem,
} from '@/components/dashboard/nav'
import { shouldShowWearablesNav } from '@/lib/wearables-feature'

const dashboardPrimaryMobileHrefs = new Set([
  '/dashboard',
  '/clients',
  '/scheduling',
  '/messages',
])

function isNavItemAvailable(item: NavItem): boolean {
  if (item.href === '/wearables' && !shouldShowWearablesNav()) {
    return false
  }
  return !item.soon
}

export function getFilteredNavGroups(): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(isNavItemAvailable),
    }))
    .filter((group) => group.items.length > 0)
}

export function getAllDashboardNavItems(): NavItem[] {
  return [...topNavItems, ...getFilteredNavGroups().flatMap((group) => group.items)]
}

export function getDashboardPrimaryMobileNavItems(): NavItem[] {
  return getAllDashboardNavItems().filter((item) =>
    dashboardPrimaryMobileHrefs.has(item.href)
  )
}

export function getDashboardOverflowMobileNavItems(): NavItem[] {
  return getAllDashboardNavItems().filter(
    (item) => !dashboardPrimaryMobileHrefs.has(item.href)
  )
}

export function getDashboardOverflowMobileNavGroups(): NavGroup[] {
  const overflowHrefs = new Set(
    getDashboardOverflowMobileNavItems().map((item) => item.href)
  )

  return getFilteredNavGroups()
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => overflowHrefs.has(item.href)),
    }))
    .filter((group) => group.items.length > 0)
}

export function getCoachNavBadgeCount(
  href: string,
  badges: {
    inboxUnread: number
    pendingFormReviews: number
    pendingProgressiveOverload: number
  }
): number {
  if (href === '/messages') return badges.inboxUnread
  if (href === '/form-review') return badges.pendingFormReviews
  if (href === '/progressive-overload') return badges.pendingProgressiveOverload
  return 0
}
