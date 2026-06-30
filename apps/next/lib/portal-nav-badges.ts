export type PortalNavBadges = {
  unreadMessages: number
  unreadFormReviewReplies: number
  checkInDue: boolean
  nutritionDue: boolean
  sessionSoon: boolean
  teamAttention: boolean
  openInvoices: number
}

export const emptyPortalNavBadges: PortalNavBadges = {
  unreadMessages: 0,
  unreadFormReviewReplies: 0,
  checkInDue: false,
  nutritionDue: false,
  sessionSoon: false,
  teamAttention: false,
  openInvoices: 0,
}

export function getPortalNavBadgeCount(
  href: string,
  badges: PortalNavBadges
): number {
  if (href === '/portal/messages') return badges.unreadMessages
  if (href === '/portal/form-review') return badges.unreadFormReviewReplies
  if (href === '/portal/check-in' && badges.checkInDue) return 1
  if (href === '/portal/nutrition' && badges.nutritionDue) return 1
  if (href === '/portal/sessions' && badges.sessionSoon) return 1
  if (href === '/portal/team' && badges.teamAttention) return 1
  if (href === '/portal/billing' && badges.openInvoices > 0) {
    return badges.openInvoices
  }
  return 0
}

export function isPortalNavRouteActive(href: string, pathname: string): boolean {
  if (href === '/portal') {
    return pathname === '/portal'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Hide section badges while the client is viewing that page. */
export function resolvePortalNavBadgeCount(
  href: string,
  badges: PortalNavBadges,
  pathname: string
): number {
  if (isPortalNavRouteActive(href, pathname)) {
    return 0
  }

  return getPortalNavBadgeCount(href, badges)
}
