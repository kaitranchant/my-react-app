import { GOOGLE_CALENDAR_API_BASE } from '@/lib/google-calendar/config'

type GoogleCalendarEventInput = {
  summary: string
  description?: string | null
  location?: string | null
  startsAt: string
  endsAt: string
}

export type GoogleCalendarEvent = {
  id: string
  status?: string
  summary?: string
  description?: string
  location?: string
  updated?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
}

type GoogleCalendarEventMutationResult = {
  id: string
  updated: string
}

type GoogleFreeBusyResponse = {
  calendars?: Record<
    string,
    {
      busy?: Array<{ start?: string; end?: string }>
    }
  >
}

type GoogleEventListResponse = {
  items?: GoogleCalendarEvent[]
  nextSyncToken?: string
}

type GoogleWatchResponse = {
  id?: string
  resourceId?: string
  expiration?: string
}

async function googleCalendarFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${GOOGLE_CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}

function parseEventMutationResult(body: {
  id?: string
  updated?: string
}): GoogleCalendarEventMutationResult {
  if (!body.id || !body.updated) {
    throw new Error('Google Calendar did not return event metadata.')
  }
  return { id: body.id, updated: body.updated }
}

export function getGoogleCalendarEventTimes(event: GoogleCalendarEvent): {
  startsAt: string
  endsAt: string
} | null {
  const startsAt = event.start?.dateTime
  const endsAt = event.end?.dateTime
  if (!startsAt || !endsAt) return null
  return { startsAt, endsAt }
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEventInput
): Promise<GoogleCalendarEventMutationResult> {
  const response = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none`,
    {
      method: 'POST',
      body: JSON.stringify({
        summary: event.summary,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: event.startsAt },
        end: { dateTime: event.endsAt },
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Google Calendar event create failed (${response.status}).`)
  }

  return parseEventMutationResult(
    (await response.json()) as { id?: string; updated?: string }
  )
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: GoogleCalendarEventInput
): Promise<GoogleCalendarEventMutationResult> {
  const response = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        summary: event.summary,
        description: event.description ?? undefined,
        location: event.location ?? undefined,
        start: { dateTime: event.startsAt },
        end: { dateTime: event.endsAt },
        attendees: [],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Google Calendar event update failed (${response.status}).`)
  }

  return parseEventMutationResult(
    (await response.json()) as { id?: string; updated?: string }
  )
}

export async function getGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<GoogleCalendarEvent | null> {
  const response = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  )

  if (response.status === 404 || response.status === 410) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Google Calendar event fetch failed (${response.status}).`)
  }

  return (await response.json()) as GoogleCalendarEvent
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE' }
  )

  if (response.status === 404 || response.status === 410) {
    return
  }

  if (!response.ok) {
    throw new Error(`Google Calendar event delete failed (${response.status}).`)
  }
}

export async function listGoogleCalendarEventsInRange(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`
    )
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('showDeleted', 'false')
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken)
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Google Calendar events list failed (${response.status}).`)
    }

    const body = (await response.json()) as GoogleEventListResponse & {
      nextPageToken?: string
    }
    events.push(...(body.items ?? []))
    pageToken = body.nextPageToken
  } while (pageToken)

  return events
}

export async function listGoogleCalendarEventChanges(
  accessToken: string,
  calendarId: string,
  options: { syncToken?: string | null; timeMin?: string }
): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken: string | null }> {
  const url = new URL(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`
  )
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('showDeleted', 'true')

  if (options.syncToken) {
    url.searchParams.set('syncToken', options.syncToken)
  } else {
    url.searchParams.set(
      'timeMin',
      options.timeMin ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    )
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })

  if (response.status === 410) {
    return listGoogleCalendarEventChanges(accessToken, calendarId, {
      syncToken: null,
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  }

  if (!response.ok) {
    throw new Error(`Google Calendar incremental sync failed (${response.status}).`)
  }

  const body = (await response.json()) as GoogleEventListResponse
  return {
    events: body.items ?? [],
    nextSyncToken: body.nextSyncToken ?? null,
  }
}

export async function watchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  input: {
    channelId: string
    webhookUrl: string
    token: string
    expirationMs: number
  }
): Promise<{ channelId: string; resourceId: string; expiration: string }> {
  const response = await googleCalendarFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: 'POST',
      body: JSON.stringify({
        id: input.channelId,
        type: 'web_hook',
        address: input.webhookUrl,
        token: input.token,
        expiration: String(Date.now() + input.expirationMs),
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Google Calendar watch failed (${response.status}).`)
  }

  const body = (await response.json()) as GoogleWatchResponse
  if (!body.id || !body.resourceId || !body.expiration) {
    throw new Error('Google Calendar watch response was incomplete.')
  }

  return {
    channelId: body.id,
    resourceId: body.resourceId,
    expiration: new Date(Number(body.expiration)).toISOString(),
  }
}

export async function stopGoogleCalendarWatchChannel(
  accessToken: string,
  channelId: string,
  resourceId: string
): Promise<void> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/channels/stop`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: channelId, resourceId }),
    cache: 'no-store',
  })

  if (response.status === 404) {
    return
  }

  if (!response.ok) {
    throw new Error(`Google Calendar watch stop failed (${response.status}).`)
  }
}

export async function fetchGoogleCalendarBusyIntervals(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<Array<{ startsAt: string; endsAt: string }>> {
  const response = await googleCalendarFetch(accessToken, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Google Calendar freeBusy failed (${response.status}).`)
  }

  const body = (await response.json()) as GoogleFreeBusyResponse
  const busy = body.calendars?.[calendarId]?.busy ?? []

  return busy
    .filter((interval) => interval.start && interval.end)
    .map((interval) => ({
      startsAt: interval.start!,
      endsAt: interval.end!,
    }))
}

export type { GoogleCalendarEventInput }
