export type PortalNavBadges = {
  unreadMessages: number
  pendingFormReviews: number
  checkInDue: boolean
  nutritionDue: boolean
}

export const emptyPortalNavBadges: PortalNavBadges = {
  unreadMessages: 0,
  pendingFormReviews: 0,
  checkInDue: false,
  nutritionDue: false,
}

export function getPortalNavBadgeCount(
  href: string,
  badges: PortalNavBadges
): number {
  if (href === '/portal/messages') return badges.unreadMessages
  if (href === '/portal/form-review') return badges.pendingFormReviews
  if (href === '/portal/check-in' && badges.checkInDue) return 1
  if (href === '/portal/nutrition' && badges.nutritionDue) return 1
  return 0
}
