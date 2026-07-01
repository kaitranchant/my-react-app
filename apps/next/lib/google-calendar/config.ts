import { getAppBaseUrl } from '@/lib/email/config'

export const GOOGLE_CALENDAR_AUTH_URL =
  'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_CALENDAR_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_CALENDAR_USERINFO_URL =
  'https://www.googleapis.com/oauth2/v2/userinfo'
export const GOOGLE_CALENDAR_API_BASE =
  'https://www.googleapis.com/calendar/v3'

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/userinfo.email',
] as const

export const GOOGLE_CALENDAR_OAUTH_COOKIE = 'google_calendar_oauth_state'
export const GOOGLE_CALENDAR_OAUTH_COOKIE_MAX_AGE_SECONDS = 600

/** Google Calendar watch channels expire after at most 7 days. */
export const GOOGLE_CALENDAR_WATCH_TTL_MS = 6 * 24 * 60 * 60 * 1000

export function getGoogleCalendarWebhookUrl(): string {
  return `${getAppBaseUrl()}/api/calendar/google/webhook`
}

export function getGoogleCalendarClientId(): string | null {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() || null
}

export function getGoogleCalendarClientSecret(): string | null {
  return process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() || null
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(getGoogleCalendarClientId() && getGoogleCalendarClientSecret())
}

export function getGoogleCalendarRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/calendar/google/callback`
}

export function getGoogleCalendarScopeString(): string {
  return GOOGLE_CALENDAR_SCOPES.join(' ')
}
