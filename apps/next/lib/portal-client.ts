import { getOrCreateCoachSelfClient } from '@/lib/coach-self'
import { createClient } from '@/lib/supabase/server'
import { repairClientInviteLinkForUser } from '@/lib/auth/client-invite-signup'
import type { Client } from 'app/types/database'

export type PortalClientRecord = Pick<
  Client,
  | 'id'
  | 'coach_id'
  | 'full_name'
  | 'avatar_url'
  | 'email'
  | 'leaderboard_opt_out'
  | 'biological_sex'
  | 'progressive_overload_enabled'
  | 'is_coach_self'
>

export type PortalClientContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  client: PortalClientRecord
}

const PORTAL_CLIENT_SELECT =
  'id, coach_id, full_name, avatar_url, email, leaderboard_opt_out, biological_sex, progressive_overload_enabled, is_coach_self'

export async function ensureCoachPortalClient(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<
  | { ok: true; clientId: string }
  | { ok: false; error: string }
> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'You must be signed in.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'coach') {
    return { ok: false, error: 'Only coach accounts can prepare personal portal access.' }
  }

  const { data: linkedClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (linkedClient?.id) {
    return { ok: true, clientId: linkedClient.id }
  }

  const selfClientResult = await getOrCreateCoachSelfClient(supabase)
  if (!selfClientResult.success) {
    return {
      ok: false,
      error: selfClientResult.error,
    }
  }

  const selfClient = selfClientResult.data.client
  if (selfClient.user_id === user.id) {
    return { ok: true, clientId: selfClient.id }
  }

  const { data: updated, error } = await supabase
    .from('clients')
    .update({ user_id: user.id })
    .eq('id', selfClient.id)
    .eq('coach_id', user.id)
    .eq('is_coach_self', true)
    .select('id')
    .maybeSingle()

  if (error || !updated) {
    return {
      ok: false,
      error: error?.message ?? 'Could not link your personal training profile to the client portal.',
    }
  }

  return { ok: true, clientId: updated.id }
}

export async function getPortalClientContext(): Promise<PortalClientContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  await repairClientInviteLinkForUser(user)

  const { data: client, error } = await supabase
    .from('clients')
    .select(PORTAL_CLIENT_SELECT)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !client) {
    return null
  }

  return {
    supabase,
    userId: user.id,
    client: client as PortalClientRecord,
  }
}

export async function requirePortalClientContext(): Promise<
  PortalClientContext | { error: string }
> {
  const ctx = await getPortalClientContext()
  if (!ctx) {
    return { error: 'Client account not found.' }
  }
  return ctx
}

export async function getLinkedClientForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from('clients')
    .select('id, is_coach_self')
    .eq('user_id', userId)
    .maybeSingle()

  return data
}
