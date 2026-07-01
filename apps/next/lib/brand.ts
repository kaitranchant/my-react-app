export const APP_NAME = 'SwiftCoach'
export const APP_DESCRIPTION =
  'Professional coaching platform for trainers, therapists, and wellness coaches — built for momentum.'

export function getLegalContactEmail(): string {
  return (
    process.env.PRIVACY_CONTACT_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.replace(/^.*<([^>]+)>.*$/, '$1').trim() ||
    'privacy@swiftcoach.app'
  )
}

/** Matches light-mode --brand (oklch 0.42 0.11 275) for static icon generation */
export const BRAND_COLOR = '#4c3d9e'
