export function slugifyBookingName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getCoachBookingSlug(
  coachName: string | null | undefined
): string | null {
  if (!coachName?.trim()) return null
  const slug = slugifyBookingName(coachName)
  return slug || null
}

export function getCoachBookingUrl(
  appBaseUrl: string,
  coachName: string | null | undefined
): string {
  const slug = getCoachBookingSlug(coachName)
  const base = appBaseUrl.replace(/\/$/, '')
  return slug ? `${base}/book/${slug}` : `${base}/portal/sessions`
}
