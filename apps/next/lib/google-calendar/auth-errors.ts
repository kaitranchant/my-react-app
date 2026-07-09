export class GoogleCalendarAuthError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'GoogleCalendarAuthError'
    this.code = code
  }
}

export function isGoogleCalendarTokenRevokedMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('invalid_grant') ||
    normalized.includes('expired or revoked') ||
    normalized.includes('token has been expired')
  )
}

export function isGoogleCalendarAuthError(
  error: unknown
): error is GoogleCalendarAuthError {
  return error instanceof GoogleCalendarAuthError
}

export function toGoogleCalendarAuthError(error: unknown): GoogleCalendarAuthError | null {
  if (isGoogleCalendarAuthError(error)) {
    return error
  }

  if (error instanceof Error && isGoogleCalendarTokenRevokedMessage(error.message)) {
    return new GoogleCalendarAuthError('invalid_grant', error.message)
  }

  return null
}

export const RECONNECT_GOOGLE_CALENDAR_MESSAGE =
  'Your Google Calendar connection expired. Disconnect and reconnect Google Calendar, then run Repair calendar sync.'

import { GoogleCalendarTimeoutError } from '@/lib/google-calendar/fetch-timeout'

export function formatGoogleCalendarActionError(error: unknown): string {
  if (toGoogleCalendarAuthError(error)) {
    return RECONNECT_GOOGLE_CALENDAR_MESSAGE
  }

  if (error instanceof GoogleCalendarTimeoutError) {
    return error.message
  }

  return error instanceof Error
    ? error.message
    : 'Google Calendar request failed.'
}
