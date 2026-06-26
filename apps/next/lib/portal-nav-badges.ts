export type PortalNavBadges = {
  unreadMessages: number
  unreadFormReviewReplies: number
  checkInDue: boolean
  nutritionDue: boolean
  sessionSoon: boolean
  teamAttention: boolean
}

export const emptyPortalNavBadges: PortalNavBadges = {
  unreadMessages: 0,
  unreadFormReviewReplies: 0,
  checkInDue: false,
  nutritionDue: false,
  sessionSoon: false,
  teamAttention: false,
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
  return 0
}
