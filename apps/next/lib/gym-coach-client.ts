import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import type { createClient } from '@/lib/supabase/server'
import type { Database, GymMemberWithProfile } from 'app/types/database'
import type { AttendanceClientRow } from '@/lib/attendance'

const gymMemberCoachClientColumns =
  'id, coach_id, full_name, avatar_url, status, coaching_type, gym_id'

export async function ensureGymCoachPortalMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gymId: string
): Promise<
  { success: true; clientId: string } | { success: false; error: string }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  return ensureGymCoachPortalMembershipForUser(supabase, user.id, gymId)
}

export async function ensureGymCoachPortalMembershipForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  gymId: string
): Promise<
  { success: true; clientId: string } | { success: false; error: string }
> {
  const { data: existingSelfClient } = await supabase
    .from('clients')
    .select('id, gym_id, user_id')
    .eq('coach_id', userId)
    .eq('is_coach_self', true)
    .maybeSingle()

  let clientId = existingSelfClient?.id

  if (!clientId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    const coachName = profile?.full_name?.trim() || 'Coach'
    const { data: created, error: createError } = await supabase
      .from('clients')
      .insert({
        coach_id: userId,
        full_name: coachName,
        status: 'active',
        is_coach_self: true,
        gym_id: gymId,
        user_id: userId,
      })
      .select('id')
      .single()

    if (createError || !created) {
      return {
        success: false,
        error: createError?.message ?? 'Could not create coach training profile.',
      }
    }

    return { success: true, clientId: created.id }
  }

  const updates: {
    gym_id?: string
    user_id?: string
  } = {}

  if (existingSelfClient.gym_id === null) {
    updates.gym_id = gymId
  }

  if (existingSelfClient.user_id !== userId) {
    updates.user_id = userId
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  }

  return { success: true, clientId }
}

export async function ensureGymCoachPortalMembershipAsAdmin(
  userId: string,
  gymId: string
): Promise<
  { success: true; clientId: string } | { success: false; error: string }
> {
  const admin = createAdminClient()
  if (!admin) {
    return {
      success: false,
      error:
        'Gym coach portal setup requires SUPABASE_SERVICE_ROLE_KEY in your server environment.',
    }
  }

  return ensureGymCoachPortalMembershipForUser(admin, userId, gymId)
}

export async function fetchGymMemberCoachClients(
  supabase: SupabaseClient<Database>,
  members: GymMemberWithProfile[],
  existingClients: AttendanceClientRow[]
): Promise<{
  clients: AttendanceClientRow[]
  coachSelfClientIds: Set<string>
}> {
  if (members.length === 0) {
    return { clients: existingClients, coachSelfClientIds: new Set() }
  }

  const existingIds = new Set(existingClients.map((client) => client.id))
  const memberCoachIds = members.map((member) => member.coach_id)

  const { data: coachSelfRows, error } = await supabase
    .from('clients')
    .select(gymMemberCoachClientColumns)
    .in('coach_id', memberCoachIds)
    .eq('is_coach_self', true)
    .eq('status', 'active')

  if (error || !coachSelfRows?.length) {
    return { clients: existingClients, coachSelfClientIds: new Set() }
  }

  const avatarByCoachId = new Map(
    members.map((member) => [member.coach_id, member.profile?.avatar_url ?? null])
  )

  const coachSelfClientIds = new Set<string>()
  const mergedClients = [...existingClients]

  for (const row of coachSelfRows) {
    if (existingIds.has(row.id)) {
      coachSelfClientIds.add(row.id)
      continue
    }

    coachSelfClientIds.add(row.id)
    mergedClients.push({
      ...(row as AttendanceClientRow),
      avatar_url: row.avatar_url ?? avatarByCoachId.get(row.coach_id) ?? null,
    })
  }

  return {
    clients: mergedClients.sort((left, right) =>
      left.full_name.localeCompare(right.full_name)
    ),
    coachSelfClientIds,
  }
}
