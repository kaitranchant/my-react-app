export type PortalNavBadges = {
  unreadMessages: number
  pendingFormReviews: number
}

export const emptyPortalNavBadges: PortalNavBadges = {
  unreadMessages: 0,
  pendingFormReviews: 0,
}

export function getPortalNavBadgeCount(
  href: string,
  badges: PortalNavBadges
): number {
  if (href === '/portal/messages') return badges.unreadMessages
  if (href === '/portal/form-review') return badges.pendingFormReviews
  return 0
}
