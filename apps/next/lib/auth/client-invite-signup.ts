import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import {
  createAdminClient,
  findAuthUserByEmail,
} from '@/lib/supabase/admin'
import {
  formatClientInviteLinkError,
  formatSupabaseAuthError,
  isUserAlreadyExistsError,
} from '@/lib/auth/errors'
import { runOnboardingAutomationForUser } from '@/lib/client-onboarding-trigger'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type ClientSignupMetadata = {
  full_name: string
  role: 'client'
  pending_invite_token: string
}

function clientSignupMetadata(
  fullName: string,
  inviteToken: string
): ClientSignupMetadata {
  return {
    full_name: fullName,
    role: 'client',
    pending_invite_token: inviteToken,
  }
}

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

async function isClientAccountLinked(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin) {
    return false
  }

  const { data } = await admin
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  return Boolean(data)
}

export async function clearPendingInviteMetadata(userId: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    return
  }

  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) {
    return
  }

  const metadata = { ...(data.user.user_metadata ?? {}) }
  delete metadata.pending_invite_token
  delete metadata.invite_token

  await admin.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  })
}

async function finalizeClientInviteLink(userId: string): Promise<void> {
  await clearPendingInviteMetadata(userId)
}

export async function linkClientInviteAsAdmin(input: {
  inviteToken: string
  userId: string
  email: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  if (!admin) {
    return {
      ok: false,
      error:
        'Client invite linking requires SUPABASE_SERVICE_ROLE_KEY in your server environment.',
    }
  }

  const { data: existingClient } = await admin
    .from('clients')
    .select('id')
    .eq('user_id', input.userId)
    .maybeSingle()

  if (existingClient) {
    await finalizeClientInviteLink(input.userId)
    return { ok: true }
  }

  const { error } = await admin.rpc('link_client_invite', {
    p_token: input.inviteToken,
    p_user_id: input.userId,
    p_email: input.email,
  })

  if (error) {
    if (await isClientAccountLinked(input.userId)) {
      await finalizeClientInviteLink(input.userId)
      return { ok: true }
    }

    return {
      ok: false,
      error: formatClientInviteLinkError(error.message),
    }
  }

  await finalizeClientInviteLink(input.userId)

  return { ok: true }
}

export async function linkClientInviteForUser(
  _supabase: SupabaseServerClient,
  input: { inviteToken: string; userId: string; email: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  return linkClientInviteAsAdmin(input)
}

async function findPendingInviteTokenForEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase()
  const { data: pendingClients } = await admin
    .from('clients')
    .select('invite_token, email, created_at')
    .eq('invite_status', 'pending')
    .not('invite_token', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const match = pendingClients?.find(
    (client) =>
      client.invite_token &&
      client.email?.trim().toLowerCase() === normalizedEmail
  )

  return match?.invite_token ?? null
}

export async function repairClientInviteLink(input: {
  userId: string
  email: string | null | undefined
  userMetadata?: Record<string, unknown> | null
}): Promise<boolean> {
  const admin = createAdminClient()
  if (!admin || !input.email?.trim()) {
    return false
  }

  const { data: linkedClient } = await admin
    .from('clients')
    .select('id')
    .eq('user_id', input.userId)
    .maybeSingle()

  if (linkedClient) {
    return false
  }

  const inviteToken =
    readPendingInviteToken(input.userMetadata) ??
    (await findPendingInviteTokenForEmail(admin, input.email))

  if (!inviteToken) {
    return false
  }

  const linked = await linkClientInviteAsAdmin({
    inviteToken,
    userId: input.userId,
    email: input.email,
  })

  if (linked.ok) {
    void runOnboardingAutomationForUser(input.userId)
    return true
  }

  return false
}

async function getPendingInviteClient(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  inviteToken: string
) {
  const { data } = await admin
    .from('clients')
    .select('id, email, invite_status, user_id')
    .eq('invite_token', inviteToken)
    .eq('invite_status', 'pending')
    .maybeSingle()

  return data
}

export async function registerInvitedClient(
  supabase: SupabaseServerClient,
  input: {
    email: string
    password: string
    fullName: string
    inviteToken: string
  }
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const admin = createAdminClient()
  if (!admin) {
    return {
      ok: false,
      error:
        'Client signup requires SUPABASE_SERVICE_ROLE_KEY in your server environment.',
    }
  }

  const pendingClient = await getPendingInviteClient(admin, input.inviteToken)
  if (!pendingClient?.email) {
    return {
      ok: false,
      error: 'This invite link is invalid or has expired. Ask your coach for a new one.',
    }
  }

  if (
    pendingClient.email.trim().toLowerCase() !== input.email.trim().toLowerCase()
  ) {
    return {
      ok: false,
      error: 'This invite was sent to a different email address.',
    }
  }

  const metadata = clientSignupMetadata(input.fullName, input.inviteToken)
  let userId: string

  const { data: created, error: createError } = await admin.auth.admin.createUser(
    {
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: metadata,
    }
  )

  if (createError) {
    if (!isUserAlreadyExistsError(createError)) {
      return { ok: false, error: formatSupabaseAuthError(createError) }
    }

    const existing = await findAuthUserByEmail(admin, input.email)
    if (!existing) {
      return {
        ok: false,
        error: 'Could not create account. Please try again.',
      }
    }

    if (pendingClient.user_id && pendingClient.user_id !== existing.id) {
      return {
        ok: false,
        error:
          'An account with this email already exists. Sign in instead, or ask your coach for a new invite link.',
      }
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      existing.id,
      {
        email_confirm: true,
        password: input.password,
        user_metadata: metadata,
      }
    )

    if (updateError) {
      return { ok: false, error: formatSupabaseAuthError(updateError) }
    }

    userId = existing.id
  } else {
    userId = created.user.id
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (signInError) {
    return { ok: false, error: formatSupabaseAuthError(signInError) }
  }

  const linked = await linkClientInviteAsAdmin({
    inviteToken: input.inviteToken,
    userId,
    email: input.email,
  })

  if (!linked.ok) {
    return { ok: false, error: linked.error }
  }

  return { ok: true, userId }
}

export async function signInClientAccount(
  supabase: SupabaseServerClient,
  input: { email: string; password: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const firstAttempt = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (!firstAttempt.error && firstAttempt.data.user) {
    await ensureClientInviteLinked(firstAttempt.data.user)
    return { ok: true }
  }

  const admin = createAdminClient()
  if (!admin) {
    return { ok: false, error: formatSupabaseAuthError(firstAttempt.error) }
  }

  const authUser = await findAuthUserByEmail(admin, input.email)
  if (!authUser) {
    return { ok: false, error: formatSupabaseAuthError(firstAttempt.error) }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .maybeSingle()

  const { data: linkedClient } = await admin
    .from('clients')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  const isClient = profile?.role === 'client' || Boolean(linkedClient)
  if (!isClient) {
    return { ok: false, error: formatSupabaseAuthError(firstAttempt.error) }
  }

  if (!authUser.email_confirmed_at) {
    const { error: confirmError } = await admin.auth.admin.updateUserById(
      authUser.id,
      { email_confirm: true }
    )

    if (confirmError) {
      return { ok: false, error: formatSupabaseAuthError(confirmError) }
    }
  }

  const retry = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (retry.error || !retry.data.user) {
    return { ok: false, error: formatSupabaseAuthError(retry.error) }
  }

  await ensureClientInviteLinked(retry.data.user)

  return { ok: true }
}

export function readPendingInviteToken(
  metadata: Record<string, unknown> | null | undefined
): string | null {
  if (!metadata) {
    return null
  }

  for (const key of ['pending_invite_token', 'invite_token']) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

export async function completePendingClientInvite(
  _supabase: SupabaseServerClient,
  input: { userId: string; email: string; inviteToken: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  return linkClientInviteAsAdmin(input)
}

export async function ensureClientInviteLinked(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>
): Promise<boolean> {
  if (await isClientAccountLinked(user.id)) {
    await finalizeClientInviteLink(user.id)
    return true
  }

  const repaired = await repairClientInviteLink({
    userId: user.id,
    email: user.email,
    userMetadata: user.user_metadata,
  })

  if (repaired || (await isClientAccountLinked(user.id))) {
    await finalizeClientInviteLink(user.id)
    return true
  }

  const inviteToken = readPendingInviteToken(user.user_metadata)
  if (!inviteToken || !user.email) {
    return false
  }

  const linked = await linkClientInviteAsAdmin({
    inviteToken,
    userId: user.id,
    email: user.email,
  })

  if (linked.ok || (await isClientAccountLinked(user.id))) {
    await finalizeClientInviteLink(user.id)
    return true
  }

  return false
}

export async function repairClientInviteLinkForUser(
  user: Pick<User, 'id' | 'email' | 'user_metadata'>
): Promise<boolean> {
  return ensureClientInviteLinked(user)
}
