import { createClient } from '@/lib/supabase/server'
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
>

export type PortalClientContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  client: PortalClientRecord
}

export async function getPortalClientContext(): Promise<PortalClientContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'client') {
    return null
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select(
      'id, coach_id, full_name, avatar_url, email, leaderboard_opt_out, biological_sex'
    )
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
