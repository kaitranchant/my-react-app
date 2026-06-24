import type { SupabaseClient } from '@supabase/supabase-js'

import type { Client, Database } from 'app/types/database'

export const COACH_SELF_CLIENT_NAME = 'My Training'

export function isCoachSelfClient(
  client: Pick<Client, 'is_coach_self'>
): boolean {
  return client.is_coach_self
}

export function excludeCoachSelfClients<T extends Pick<Client, 'is_coach_self'>>(
  clients: T[]
): T[] {
  return clients.filter((client) => !client.is_coach_self)
}

function isMissingCoachSelfColumn(message: string) {
  return (
    message.includes('is_coach_self') ||
    message.includes('column') ||
    message.includes('Could not find')
  )
}

export type CoachSelfClientResult =
  | {
      success: true
      data: { client: Client; coachName: string }
    }
  | {
      success: false
      needsMigration: true
      error: string
    }
  | {
      success: false
      needsMigration?: false
      error: string
    }

export async function getOrCreateCoachSelfClient(
  supabase: SupabaseClient<Database>
): Promise<CoachSelfClientResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  const coachName = profile?.full_name?.trim() || 'Coach'

  const { data: existing, error: findError } = await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user.id)
    .eq('is_coach_self', true)
    .maybeSingle()

  if (findError) {
    if (isMissingCoachSelfColumn(findError.message)) {
      return {
        success: false,
        needsMigration: true,
        error: findError.message,
      }
    }
    return { success: false, error: findError.message }
  }

  if (existing) {
    if (existing.full_name !== coachName) {
      const { data: updated } = await supabase
        .from('clients')
        .update({ full_name: coachName })
        .eq('id', existing.id)
        .select('*')
        .single()

      return {
        success: true,
        data: { client: (updated ?? existing) as Client, coachName },
      }
    }

    return {
      success: true,
      data: { client: existing as Client, coachName },
    }
  }

  const { data: created, error: createError } = await supabase
    .from('clients')
    .insert({
      coach_id: user.id,
      full_name: coachName,
      status: 'active',
      is_coach_self: true,
    })
    .select('*')
    .single()

  if (createError) {
    if (isMissingCoachSelfColumn(createError.message)) {
      return {
        success: false,
        needsMigration: true,
        error: createError.message,
      }
    }
    return { success: false, error: createError.message }
  }

  if (!created) {
    return { success: false, error: 'Could not create personal training profile.' }
  }

  return {
    success: true,
    data: { client: created as Client, coachName },
  }
}
