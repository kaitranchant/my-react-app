import type { SupabaseClient } from '@supabase/supabase-js'

import type { GoogleEventMarkerStatus } from '@/lib/google-calendar/blocked-times-filter'

export async function fetchCoachGoogleEventMarkers(
  supabase: SupabaseClient,
  coachId: string,
  googleEventIds: string[]
): Promise<Map<string, GoogleEventMarkerStatus>> {
  const uniqueIds = Array.from(new Set(googleEventIds.filter(Boolean)))
  if (uniqueIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('coach_google_event_markers')
    .select('google_event_id, status')
    .eq('coach_id', coachId)
    .in('google_event_id', uniqueIds)

  if (error || !data) {
    return new Map()
  }

  const markers = new Map<string, GoogleEventMarkerStatus>()
  for (const row of data) {
    if (
      row.google_event_id &&
      (row.status === 'completed' ||
        row.status === 'cancelled' ||
        row.status === 'no_show')
    ) {
      markers.set(row.google_event_id, row.status)
    }
  }

  return markers
}
