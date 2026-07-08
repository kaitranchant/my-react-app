import type { User } from '@supabase/supabase-js'

import { formatGymInviteLinkError } from '@/lib/auth/errors'
import { createAdminClient } from '@/lib/supabase/admin'

const INVITE_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readPendingGymInviteToken(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata) return null

  for (const key of ['pending_gym_invite_token', 'gym_invite_token']) {
    const value = metadata[key]
    if (typeof value === 'string' && INVITE_TOKEN_PATTERN.test(value)) {
      return value
    }
  }

  return null
}

async function clearPendingGymInviteMetadata(userId: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) return

  const metadata = { ...(data.user.user_metadata ?? {}) }
  delete metadata.pending_gym_invite_token
  delete metadata.gym_invite_token

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  })
}

export async function linkGymInviteAsAdmin(input: {
  inviteToken: string
  userId: string
  email: string
}): Promise<{ ok: true; gymId: string } | { ok: false; error: string }> {
  const admin = createAdminClient()
  if (!admin) {
    return {
      ok: false,
      error:
        'Gym invite linking requires SUPABASE_SERVICE_ROLE_KEY in your server environment.',
    }
  }

  const { data, error } = await admin.rpc('link_gym_invite', {
    p_token: input.inviteToken,
    p_user_id: input.userId,
    p_email: input.email,
  })

  if (error) {
    return {
      ok: false,
      error: formatGymInviteLinkError(error.message),
    }
  }

  await clearPendingGymInviteMetadata(input.userId)

  return { ok: true, gymId: data as string }
}

export async function ensureGymInviteLinked(user: User): Promise<boolean> {
  const inviteToken = readPendingGymInviteToken(user.user_metadata)
  if (!inviteToken || !user.email?.trim()) {
    return false
  }

  const admin = createAdminClient()
  if (!admin) {
    return false
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'client') {
    return false
  }

  const linked = await linkGymInviteAsAdmin({
    inviteToken,
    userId: user.id,
    email: user.email,
  })

  return linked.ok
}
