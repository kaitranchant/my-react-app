'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requirePortalClientContext } from '@/lib/portal-client'
import { verifyClientTeamMembership } from '@/lib/portal-teams'
import { teamEventRsvpStatuses } from '@/lib/validations/team'

export type ActionResult = { success: true } | { success: false; error: string }

const portalRsvpSchema = z.object({
  teamId: z.string().uuid(),
  eventId: z.string().uuid(),
  rsvpStatus: z.enum(teamEventRsvpStatuses),
})

function revalidateTeamPaths(teamId: string) {
  revalidatePath('/portal/team')
  revalidatePath('/portal')
  revalidatePath(`/teams/${teamId}`)
}

export async function updateMyTeamEventRsvp(
  teamId: string,
  eventId: string,
  rsvpStatus: (typeof teamEventRsvpStatuses)[number]
): Promise<ActionResult> {
  const parsed = portalRsvpSchema.safeParse({ teamId, eventId, rsvpStatus })
  if (!parsed.success) {
    return { success: false, error: 'Invalid RSVP.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const clientId = ctx.client.id
  const isMember = await verifyClientTeamMembership(
    ctx.supabase,
    clientId,
    teamId
  )
  if (!isMember) {
    return { success: false, error: 'You are not on this team.' }
  }

  const { data: event, error: eventError } = await ctx.supabase
    .from('team_events')
    .select('id, team_id')
    .eq('id', eventId)
    .eq('team_id', teamId)
    .maybeSingle()

  if (eventError || !event) {
    return { success: false, error: 'Event not found.' }
  }

  const { data: existing } = await ctx.supabase
    .from('team_event_member_status')
    .select('attendance_status')
    .eq('event_id', eventId)
    .eq('client_id', clientId)
    .maybeSingle()

  const { error } = await ctx.supabase.from('team_event_member_status').upsert(
    {
      event_id: eventId,
      client_id: clientId,
      rsvp_status: parsed.data.rsvpStatus,
      attendance_status: existing?.attendance_status ?? null,
    },
    { onConflict: 'event_id,client_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeamPaths(teamId)
  return { success: true }
}
