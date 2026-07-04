import {
  addDaysToDateKey,
  parseDateKey,
  toDateKey,
} from '@/lib/calendar'
import { resolveCoachTimezone, resolveSchedulingIana, type CoachPreferences } from '@/lib/coach-preferences'
import type {
  CoachAvailabilityException,
  CoachAvailabilityRule,
  CoachingAppointment,
  SessionBookingSettings,
} from '@/lib/session-booking-types'

/** Bookable start-time increments shown in the booking time picker. */
export const BOOKING_SLOT_STEP_MINUTES = 15

/** Availability grid paints 30-minute cells; rules expand to 15-minute bookable starts. */
const AVAILABILITY_GRID_SLOT_MINUTES = 30

export type AvailableSlot = {
  startsAt: string
  endsAt: string
  dateKey: string
  startTimeLabel: string
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTimeLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`
}

function getDateKeyInTimezone(date: Date, iana: string | null): string {
  if (!iana) {
    return toDateKey(date)
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getDayOfWeekInTimezone(dateKey: string, iana: string | null): number {
  if (!iana) {
    return parseDateKey(dateKey).getDay()
  }

  const utcMidday = new Date(`${dateKey}T12:00:00Z`)
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    weekday: 'short',
  }).format(utcMidday)

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return map[weekday] ?? parseDateKey(dateKey).getDay()
}

export function combineDateAndTimeToUtc(
  dateKey: string,
  time: string,
  timezone: CoachPreferences['timezone'],
  clientTimeZone?: string | null
): Date {
  const iana = resolveSchedulingIana(timezone, clientTimeZone)
  if (!iana) {
    const [year, month, day] = dateKey.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))
  }

  const [hours, minutes] = time.split(':').map(Number)
  const utcGuess = new Date(`${dateKey}T${time}:00Z`)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

  for (let offsetHours = -14; offsetHours <= 14; offsetHours++) {
    const candidate = new Date(
      Date.UTC(
        utcGuess.getUTCFullYear(),
        utcGuess.getUTCMonth(),
        utcGuess.getUTCDate(),
        hours - offsetHours,
        minutes,
        0,
        0
      )
    )

    const parts = formatter.formatToParts(candidate)
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((entry) => entry.type === type)?.value)

    if (
      part('year') === Number(dateKey.slice(0, 4)) &&
      part('month') === Number(dateKey.slice(5, 7)) &&
      part('day') === Number(dateKey.slice(8, 10)) &&
      part('hour') === hours &&
      part('minute') === minutes
    ) {
      return candidate
    }
  }

  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))
}

/**
 * Expand painted availability ranges into bookable 15-minute cells.
 * Grid painting uses 30-minute cells; any half-hour block includes both
 * :00 and :30 quarter-hour starts inside it.
 */
function addRuleCells(
  cells: Set<number>,
  startTime: string,
  endTime: string
) {
  const startMinutes = parseTimeToMinutes(startTime.slice(0, 5))
  const endMinutes = parseTimeToMinutes(endTime.slice(0, 5))

  for (
    let gridSlot = startMinutes;
    gridSlot < endMinutes;
    gridSlot += AVAILABILITY_GRID_SLOT_MINUTES
  ) {
    if (
      gridSlot < endMinutes &&
      gridSlot + AVAILABILITY_GRID_SLOT_MINUTES > startMinutes
    ) {
      for (
        let slot = gridSlot;
        slot < gridSlot + AVAILABILITY_GRID_SLOT_MINUTES;
        slot += BOOKING_SLOT_STEP_MINUTES
      ) {
        if (slot < endMinutes) {
          cells.add(slot)
        }
      }
    }
  }
}

function removeRuleCells(
  cells: Set<number>,
  startTime: string,
  endTime: string
) {
  const startMinutes = parseTimeToMinutes(startTime.slice(0, 5))
  const endMinutes = parseTimeToMinutes(endTime.slice(0, 5))

  for (const slot of Array.from(cells)) {
    if (
      slot < endMinutes &&
      slot + BOOKING_SLOT_STEP_MINUTES > startMinutes
    ) {
      cells.delete(slot)
    }
  }
}

function getAvailabilityCellsForDate(
  dateKey: string,
  rules: CoachAvailabilityRule[],
  exceptions: CoachAvailabilityException[],
  timezone: CoachPreferences['timezone'],
  clientTimeZone?: string | null
): Set<number> {
  const iana = resolveSchedulingIana(timezone, clientTimeZone)
  const dayOfWeek = getDayOfWeekInTimezone(dateKey, iana)
  const cells = new Set<number>()

  for (const rule of rules) {
    if (rule.day_of_week !== dayOfWeek) continue
    addRuleCells(cells, rule.start_time, rule.end_time)
  }

  const dayExceptions = exceptions.filter(
    (exception) => exception.exception_date === dateKey
  )

  for (const exception of dayExceptions) {
    if (exception.exception_type === 'extra_hours') {
      if (exception.start_time && exception.end_time) {
        addRuleCells(cells, exception.start_time, exception.end_time)
      }
      continue
    }

    if (!exception.start_time || !exception.end_time) {
      cells.clear()
      return cells
    }

    removeRuleCells(cells, exception.start_time, exception.end_time)
  }

  return cells
}

function sessionFitsInCells(
  cells: Set<number>,
  startMinutes: number,
  durationMinutes: number
): boolean {
  for (
    let offset = 0;
    offset < durationMinutes;
    offset += BOOKING_SLOT_STEP_MINUTES
  ) {
    if (!cells.has(startMinutes + offset)) {
      return false
    }
  }
  return true
}

export function overlapsExisting(
  slotStart: Date,
  slotEnd: Date,
  appointments: CoachingAppointment[],
  bufferMinutes: number
): boolean {
  const bufferMs = bufferMinutes * 60_000

  return appointments.some((appointment) => {
    if (appointment.status !== 'scheduled') return false
    const existingStart = new Date(appointment.starts_at).getTime() - bufferMs
    const existingEnd = new Date(appointment.ends_at).getTime() + bufferMs
    const startMs = slotStart.getTime()
    const endMs = slotEnd.getTime()
    return startMs < existingEnd && endMs > existingStart
  })
}

export function computeAvailableSlots(options: {
  dateKeys: string[]
  rules: CoachAvailabilityRule[]
  exceptions: CoachAvailabilityException[]
  appointments: CoachingAppointment[]
  settings: SessionBookingSettings
  timezone: CoachPreferences['timezone']
  referenceDate?: Date
  ignoreMinNotice?: boolean
  clientTimeZone?: string | null
}): AvailableSlot[] {
  const {
    dateKeys,
    rules,
    exceptions,
    appointments,
    settings,
    timezone,
    referenceDate = new Date(),
    ignoreMinNotice = false,
    clientTimeZone,
  } = options

  const duration = settings.default_session_duration_minutes
  const buffer = settings.booking_buffer_minutes
  const minNoticeMs = settings.booking_min_notice_hours * 60 * 60 * 1000
  const maxAheadMs = settings.booking_max_days_ahead * 24 * 60 * 60 * 1000
  const earliest = ignoreMinNotice
    ? referenceDate.getTime()
    : referenceDate.getTime() + minNoticeMs
  const latest = referenceDate.getTime() + maxAheadMs
  const slots: AvailableSlot[] = []

  for (const dateKey of dateKeys) {
    const cells = getAvailabilityCellsForDate(
      dateKey,
      rules,
      exceptions,
      timezone,
      clientTimeZone
    )
    const starts = Array.from(cells).sort((left, right) => left - right)

    for (const start of starts) {
      if (!sessionFitsInCells(cells, start, duration)) {
        continue
      }

      const hours = Math.floor(start / 60)
      const mins = start % 60
      const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
      const slotStart = combineDateAndTimeToUtc(
        dateKey,
        time,
        timezone,
        clientTimeZone
      )
      const slotEnd = new Date(slotStart.getTime() + duration * 60_000)

      if (slotStart.getTime() < earliest || slotStart.getTime() > latest) {
        continue
      }

      if (overlapsExisting(slotStart, slotEnd, appointments, buffer)) {
        continue
      }

      slots.push({
        startsAt: slotStart.toISOString(),
        endsAt: slotEnd.toISOString(),
        dateKey,
        startTimeLabel: minutesToTimeLabel(start),
      })
    }
  }

  return slots
}

export function getSchedulingDateKeys(
  startDateKey: string,
  count: number
): string[] {
  const keys: string[] = []
  let current = startDateKey
  for (let index = 0; index < count; index++) {
    keys.push(current)
    current = addDaysToDateKey(current, 1)
  }
  return keys
}

export function formatAppointmentRange(
  startsAt: string,
  endsAt: string,
  timezone: CoachPreferences['timezone']
): string {
  const iana = resolveCoachTimezone(timezone)
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: iana ?? undefined,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: iana ?? undefined,
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`
}

export function getCoachDateKeyFromReference(
  timezone: CoachPreferences['timezone'],
  referenceDate = new Date(),
  clientTimeZone?: string | null
): string {
  const iana = resolveSchedulingIana(timezone, clientTimeZone)
  return getDateKeyInTimezone(referenceDate, iana)
}

export function getDateKeyFromInstant(
  instant: string | Date,
  timezone: CoachPreferences['timezone'],
  clientTimeZone?: string | null
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  const iana = resolveSchedulingIana(timezone, clientTimeZone)
  return getDateKeyInTimezone(date, iana)
}

export function getDayOfWeekForDateKey(
  dateKey: string,
  timezone: CoachPreferences['timezone'],
  clientTimeZone?: string | null
): number {
  const iana = resolveSchedulingIana(timezone, clientTimeZone)
  return getDayOfWeekInTimezone(dateKey, iana)
}

export function getTimeFromInstant(
  instant: string,
  timezone: CoachPreferences['timezone'],
  clientTimeZone?: string | null
): string {
  const iana = resolveSchedulingIana(timezone, clientTimeZone)
  const date = new Date(instant)

  if (!iana) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: iana,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00'
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00'
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

export function computeWeeklyAnchorStartsAtForDay(
  baseStartsAtIso: string,
  targetDayOfWeek: number,
  timezone: CoachPreferences['timezone'],
  clientTimeZone?: string | null
): string {
  const baseDateKey = getDateKeyFromInstant(
    baseStartsAtIso,
    timezone,
    clientTimeZone
  )
  const baseDayOfWeek = getDayOfWeekForDateKey(
    baseDateKey,
    timezone,
    clientTimeZone
  )
  const dayOffset = (targetDayOfWeek - baseDayOfWeek + 7) % 7
  const targetDateKey = addDaysToDateKey(baseDateKey, dayOffset)
  const time = getTimeFromInstant(baseStartsAtIso, timezone, clientTimeZone)

  return combineDateAndTimeToUtc(
    targetDateKey,
    time,
    timezone,
    clientTimeZone
  ).toISOString()
}

export function resolveRepeatDaysOfWeek(
  baseStartsAtIso: string,
  repeatDaysOfWeek: number[] | undefined,
  timezone: CoachPreferences['timezone'],
  clientTimeZone?: string | null
): number[] {
  if (repeatDaysOfWeek?.length) {
    return Array.from(new Set(repeatDaysOfWeek)).sort(
      (left, right) => left - right
    )
  }

  const baseDateKey = getDateKeyFromInstant(
    baseStartsAtIso,
    timezone,
    clientTimeZone
  )

  return [
    getDayOfWeekForDateKey(baseDateKey, timezone, clientTimeZone),
  ]
}

export function validateCoachBookableInstant(options: {
  startsAt: string
  settings: SessionBookingSettings
  appointments: CoachingAppointment[]
}): { ok: true; endsAt: string } | { ok: false; error: string } {
  const duration = options.settings.default_session_duration_minutes
  const slotStart = new Date(options.startsAt)
  const slotEnd = new Date(slotStart.getTime() + duration * 60_000)

  if (
    overlapsExisting(
      slotStart,
      slotEnd,
      options.appointments,
      options.settings.booking_buffer_minutes
    )
  ) {
    return {
      ok: false,
      error: 'That time conflicts with another session.',
    }
  }

  return { ok: true, endsAt: slotEnd.toISOString() }
}

export function sessionsRemaining(pack: {
  total_sessions: number
  sessions_used: number
}): number {
  return Math.max(0, pack.total_sessions - pack.sessions_used)
}

export function isSessionPackActive(
  pack: {
    total_sessions: number
    sessions_used: number
    expires_at: string | null
  },
  dateKey: string
): boolean {
  if (sessionsRemaining(pack) <= 0) return false
  if (!pack.expires_at) return true
  return pack.expires_at >= dateKey
}
