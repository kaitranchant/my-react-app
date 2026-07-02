import { createClient } from '@/lib/supabase/server'
import {
  createAdminClient,
  findAuthUserByEmail,
} from '@/lib/supabase/admin'
import { formatClientInviteLinkError } from '@/lib/auth/errors'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export async function deleteOrphanedInvitedAuthUser(
  email: string
): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) {
    return false
  }

  const authUser = await findAuthUserByEmail(admin, email)
  if (!authUser?.invited_at) {
    return false
  }

  const { data: linkedClient } = await admin
    .from('clients')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (linkedClient) {
    return false
  }

  const { error } = await admin.auth.admin.deleteUser(authUser.id)
  return !error
}

export async function linkClientInviteForUser(
  supabase: SupabaseServerClient,
  input: { inviteToken: string; userId: string; email: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', input.userId)
    .maybeSingle()

  if (existingClient) {
    return { ok: true }
  }

  const { error } = await supabase.rpc('link_client_invite', {
    p_token: input.inviteToken,
    p_user_id: input.userId,
    p_email: input.email,
  })

  if (error) {
    return {
      ok: false,
      error: formatClientInviteLinkError(error.message),
    }
  }

  return { ok: true }
}

export async function recoverExistingClientInviteSignup(
  supabase: SupabaseServerClient,
  input: {
    email: string
    password: string
    inviteToken: string
  }
): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string; canRetrySignup: boolean }
> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (!error && data.user) {
    const linked = await linkClientInviteForUser(supabase, {
      inviteToken: input.inviteToken,
      userId: data.user.id,
      email: input.email,
    })

    if (!linked.ok) {
      return { ok: false, error: linked.error, canRetrySignup: false }
    }

    return { ok: true, userId: data.user.id }
  }

  const removedOrphan = await deleteOrphanedInvitedAuthUser(input.email)
  if (removedOrphan) {
    return {
      ok: false,
      error: '',
      canRetrySignup: true,
    }
  }

  return {
    ok: false,
    error:
      'An account with this email already exists. Sign in instead, or ask your coach for a new invite link.',
    canRetrySignup: false,
  }
}
