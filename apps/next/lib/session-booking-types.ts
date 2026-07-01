import type {
  ClientCoachingType,
  CoachingAppointmentBookedBy,
  CoachingAppointmentStatus,
  CoachingSessionType,
  CoachAvailabilityExceptionType,
} from 'app/types/database'

export type SessionBookingSettings = {
  session_booking_enabled: boolean
  default_session_duration_minutes: number
  booking_buffer_minutes: number
  booking_min_notice_hours: number
  booking_max_days_ahead: number
  default_session_location: string | null
  booking_requires_session_pack: boolean
  appointment_reminder_hours: number
}

export type CoachAvailabilityRule = {
  id: string
  coach_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export type CoachAvailabilityException = {
  id: string
  coach_id: string
  exception_date: string
  exception_type: CoachAvailabilityExceptionType
  start_time: string | null
  end_time: string | null
  notes: string | null
}

export type ClientSessionPack = {
  id: string
  client_id: string
  coach_id: string
  label: string
  total_sessions: number
  sessions_used: number
  expires_at: string | null
  notes: string | null
  price_cents: number | null
  created_at: string
  client?: { full_name: string | null } | null
}

export type CoachingAppointment = {
  id: string
  coach_id: string
  client_id: string
  starts_at: string
  ends_at: string
  status: CoachingAppointmentStatus
  location: string | null
  notes: string | null
  pre_session_notes: string | null
  post_session_notes: string | null
  coaching_type: ClientCoachingType | null
  session_type: CoachingSessionType
  session_pack_id: string | null
  booked_by: CoachingAppointmentBookedBy
  cancelled_at: string | null
  cancellation_reason: string | null
  rescheduled_to_id: string | null
  created_at: string
  client?: { full_name: string | null; coaching_type: ClientCoachingType | null } | null
}

export const SESSION_BOOKING_SETTINGS_SELECT =
  'session_booking_enabled, default_session_duration_minutes, booking_buffer_minutes, booking_min_notice_hours, booking_max_days_ahead, default_session_location, booking_requires_session_pack, appointment_reminder_hours'

export const defaultSessionBookingSettings: SessionBookingSettings = {
  session_booking_enabled: false,
  default_session_duration_minutes: 60,
  booking_buffer_minutes: 15,
  booking_min_notice_hours: 24,
  booking_max_days_ahead: 60,
  default_session_location: null,
  booking_requires_session_pack: false,
  appointment_reminder_hours: 24,
}

export function parseSessionBookingSettings(
  row?: Partial<SessionBookingSettings> | null
): SessionBookingSettings {
  return {
    session_booking_enabled:
      row?.session_booking_enabled ??
      defaultSessionBookingSettings.session_booking_enabled,
    default_session_duration_minutes:
      row?.default_session_duration_minutes ??
      defaultSessionBookingSettings.default_session_duration_minutes,
    booking_buffer_minutes:
      row?.booking_buffer_minutes ??
      defaultSessionBookingSettings.booking_buffer_minutes,
    booking_min_notice_hours:
      row?.booking_min_notice_hours ??
      defaultSessionBookingSettings.booking_min_notice_hours,
    booking_max_days_ahead:
      row?.booking_max_days_ahead ??
      defaultSessionBookingSettings.booking_max_days_ahead,
    default_session_location:
      row?.default_session_location ??
      defaultSessionBookingSettings.default_session_location,
    booking_requires_session_pack:
      row?.booking_requires_session_pack ??
      defaultSessionBookingSettings.booking_requires_session_pack,
    appointment_reminder_hours:
      row?.appointment_reminder_hours ??
      defaultSessionBookingSettings.appointment_reminder_hours,
  }
}

export function sessionBookingSettingsToRow(
  values: import('@/lib/validations/session-booking').SessionBookingSettingsValues
) {
  return {
    session_booking_enabled: values.sessionBookingEnabled,
    default_session_duration_minutes: values.defaultSessionDurationMinutes,
    booking_buffer_minutes: values.bookingBufferMinutes,
    booking_min_notice_hours: values.bookingMinNoticeHours,
    booking_max_days_ahead: values.bookingMaxDaysAhead,
    default_session_location: values.defaultSessionLocation?.trim() || null,
    booking_requires_session_pack: values.bookingRequiresSessionPack,
    appointment_reminder_hours: values.appointmentReminderHours,
  }
}

export function sessionBookingSettingsToFormValues(
  settings: SessionBookingSettings
): import('@/lib/validations/session-booking').SessionBookingSettingsValues {
  return {
    sessionBookingEnabled: settings.session_booking_enabled,
    defaultSessionDurationMinutes: settings.default_session_duration_minutes,
    bookingBufferMinutes: settings.booking_buffer_minutes,
    bookingMinNoticeHours: settings.booking_min_notice_hours,
    bookingMaxDaysAhead: settings.booking_max_days_ahead,
    defaultSessionLocation: settings.default_session_location ?? '',
    bookingRequiresSessionPack: settings.booking_requires_session_pack,
    appointmentReminderHours: settings.appointment_reminder_hours,
  }
}

export const appointmentStatusLabels: Record<CoachingAppointmentStatus, string> =
  {
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No show',
    rescheduled: 'Rescheduled',
  }

export const weekdayLabels = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const
