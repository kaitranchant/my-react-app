'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient, findAuthUserByEmail } from '@/lib/supabase/admin'
import { CLIENT_INVITE_EXPIRY_DAYS } from '@/lib/constants'
import { getGymMembershipForCoach, getGymIdsForCoach } from '@/lib/gym-access'
import { buildClientInviteUrl } from '@/lib/invite'
import {
  clientFormSchema,
  clientNotesSchema,
  clientStatuses,
  inviteClientSchema,
  type ClientFormValues,
  type InviteClientValues,
} from '@/lib/validations/client'
import type { ClientCoachingType, ClientStatus } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateClientResult =
  | { success: true; clientId: string }
  | { success: false; error: string }

export type InviteActionResult =
  | { success: true; inviteUrl: string; clientId: string }
  | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

async function getOrigin() {
  return (await headers()).get('origin') ?? ''
}

function inviteExpiresAt() {
  const expires = new Date()
  expires.setDate(expires.getDate() + CLIENT_INVITE_EXPIRY_DAYS)
  return expires.toISOString()
}

function newInviteToken() {
  return crypto.randomUUID()
}

function toRow(values: ClientFormValues) {
  return {
    full_name: values.fullName,
    email: values.email ? values.email : null,
    phone: values.phone ? values.phone : null,
    status: values.status,
    coaching_type: values.coachingType && values.coachingType !== 'none'
      ? values.coachingType
      : null,
    goal: values.goal ? values.goal : null,
    notes: values.notes ? values.notes : null,
  }
}

async function resolveGymIdForCreate(
  userId: string,
  gymId?: string
): Promise<{ gymId: string | null } | { error: string }> {
  if (!gymId || gymId === 'none') {
    return { gymId: null }
  }

  const membership = await getGymMembershipForCoach(userId, gymId)
  if (!membership) {
    return { error: 'You must be a member of the selected gym.' }
  }

  return { gymId }
}

function revalidateClients() {
  revalidatePath('/clients')
  revalidatePath('/dashboard')
}

async function rejectCoachSelfClientMutation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<ActionResult | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('is_coach_self')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { success: false, error: error.message }
  }

  if (data?.is_coach_self) {
    return {
      success: false,
      error: 'This profile is managed from My Workouts.',
    }
  }

  return null
}

function coachingTypeForInsert(
  coachingType?: ClientFormValues['coachingType']
): ClientCoachingType | null {
  return coachingType && coachingType !== 'none' ? coachingType : null
}

export async function createClientRecord(
  values: ClientFormValues
): Promise<CreateClientResult> {
  const parsed = clientFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const gymResult = await resolveGymIdForCreate(user.id, parsed.data.gymId)
  if ('error' in gymResult) {
    return { success: false, error: gymResult.error }
  }

  const { data: clientId, error } = await supabase.rpc('coach_create_client', {
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email ?? '',
    p_phone: parsed.data.phone ?? '',
    p_status: parsed.data.status,
    p_coaching_type: coachingTypeForInsert(parsed.data.coachingType),
    p_gym_id: gymResult.gymId,
    p_goal: parsed.data.goal ?? '',
    p_notes: parsed.data.notes ?? '',
  })

  if (error || !clientId) {
    return { success: false, error: error?.message ?? 'Could not create client.' }
  }

  revalidateClients()
  return { success: true, clientId }
}

export async function updateClientRecord(
  id: string,
  values: ClientFormValues
): Promise<ActionResult> {
  const parsed = clientFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase } = await requireUser()
  const blocked = await rejectCoachSelfClientMutation(supabase, id)
  if (blocked) {
    return blocked
  }

  const { error } = await supabase
    .from('clients')
    .update(toRow(parsed.data))
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  revalidatePath(`/clients/${id}`)
  return { success: true }
}

export async function setClientStatus(
  id: string,
  status: ClientStatus
): Promise<ActionResult> {
  if (!clientStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' }
  }

  const { supabase } = await requireUser()
  const blocked = await rejectCoachSelfClientMutation(supabase, id)
  if (blocked) {
    return blocked
  }

  const { error } = await supabase
    .from('clients')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  revalidatePath(`/clients/${id}`)
  return { success: true }
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const blocked = await rejectCoachSelfClientMutation(supabase, id)
  if (blocked) {
    return blocked
  }

  const { error } = await supabase.from('clients').delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  return { success: true }
}

export async function inviteClientRecord(
  values: InviteClientValues
): Promise<InviteActionResult> {
  const parsed = inviteClientSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const token = newInviteToken()
  const { supabase, user } = await requireUser()
  const gymResult = await resolveGymIdForCreate(user.id, parsed.data.gymId)
  if ('error' in gymResult) {
    return { success: false, error: gymResult.error }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      coach_id: user.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      coaching_type:
        parsed.data.coachingType && parsed.data.coachingType !== 'none'
          ? parsed.data.coachingType
          : null,
      gym_id: gymResult.gymId,
      goal: parsed.data.goal ? parsed.data.goal : null,
      status: 'active',
      invite_status: 'pending',
      invite_token: token,
      invite_expires_at: inviteExpiresAt(),
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create invite.' }
  }

  revalidateClients()
  const origin = await getOrigin()
  return {
    success: true,
    inviteUrl: buildClientInviteUrl(token, origin),
    clientId: data.id,
  }
}

export async function sendClientInvite(
  clientId: string
): Promise<InviteActionResult> {
  const { supabase, user } = await requireUser()

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, email, invite_status, user_id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  if (client.user_id || client.invite_status === 'accepted') {
    return { success: false, error: 'This client already has an account.' }
  }

  if (!client.email?.trim()) {
    return {
      success: false,
      error: 'Add an email to this client before sending an invite.',
    }
  }

  const token = newInviteToken()
  const { error } = await supabase
    .from('clients')
    .update({
      invite_status: 'pending',
      invite_token: token,
      invite_expires_at: inviteExpiresAt(),
    })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  revalidatePath(`/clients/${clientId}`)
  const origin = await getOrigin()
  return {
    success: true,
    inviteUrl: buildClientInviteUrl(token, origin),
    clientId,
  }
}

export async function getClientInviteLink(
  clientId: string
): Promise<InviteActionResult> {
  const { supabase, user } = await requireUser()

  const { data: client, error } = await supabase
    .from('clients')
    .select('invite_token, invite_status, invite_expires_at')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !client) {
    return { success: false, error: 'Client not found.' }
  }

  if (client.invite_status !== 'pending' || !client.invite_token) {
    return { success: false, error: 'No active invite for this client.' }
  }

  if (
    client.invite_expires_at &&
    new Date(client.invite_expires_at) <= new Date()
  ) {
    return { success: false, error: 'Invite has expired. Send a new one.' }
  }

  const origin = await getOrigin()
  return {
    success: true,
    inviteUrl: buildClientInviteUrl(client.invite_token, origin),
    clientId,
  }
}

export async function updateClientNotes(
  id: string,
  notes: string
): Promise<ActionResult> {
  const parsed = clientNotesSchema.safeParse(notes)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid notes.',
    }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('clients')
    .update({ notes: parsed.data ? parsed.data : null })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/clients/${id}`)
  return { success: true }
}

export async function updateClientLeaderboardOptOut(
  clientId: string,
  optOut: boolean
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('clients')
    .update({ leaderboard_opt_out: optOut })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/leaderboards')
  revalidatePath('/portal/leaderboards')
  return { success: true }
}

export async function updateClientBiologicalSex(
  clientId: string,
  biologicalSex: 'male' | 'female' | null
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('clients')
    .update({ biological_sex: biologicalSex })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/leaderboards')
  revalidatePath('/portal/leaderboards')
  return { success: true }
}

export async function sendClientPasswordResetEmail(
  clientId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, email, invite_status, user_id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  const hasAccount =
    client.invite_status === 'accepted' || Boolean(client.user_id)

  if (!hasAccount) {
    return {
      success: false,
      error: 'This client has not activated their account yet.',
    }
  }

  if (!client.email?.trim()) {
    return {
      success: false,
      error: 'Add an email to this client before sending a password reset.',
    }
  }

  const origin = await getOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(
    client.email.trim(),
    {
      redirectTo: `${origin.replace(/\/$/, '')}/auth/callback?next=/portal`,
    }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function resendClientActivationEmail(
  clientId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select(
      'id, email, full_name, invite_status, user_id, invite_token, invite_expires_at'
    )
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  const hasAccount =
    client.invite_status === 'accepted' || Boolean(client.user_id)

  if (hasAccount) {
    return {
      success: false,
      error: 'This client already has an active account.',
    }
  }

  if (!client.email?.trim()) {
    return {
      success: false,
      error: 'Add an email to this client before sending an activation email.',
    }
  }

  const email = client.email.trim()
  const origin = (await getOrigin()).replace(/\/$/, '')
  const redirectTo = `${origin}/auth/callback?next=/portal`

  let token = client.invite_token
  const inviteExpired =
    client.invite_expires_at &&
    new Date(client.invite_expires_at) <= new Date()

  if (!token || inviteExpired || client.invite_status === 'not_invited') {
    token = newInviteToken()
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        invite_status: 'pending',
        invite_token: token,
        invite_expires_at: inviteExpiresAt(),
      })
      .eq('id', clientId)
      .eq('coach_id', user.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  }

  const admin = createAdminClient()
  if (!admin) {
    return {
      success: false,
      error:
        'Activation emails require SUPABASE_SERVICE_ROLE_KEY in your server environment.',
    }
  }

  try {
    const authUser = await findAuthUserByEmail(admin, email)

    if (authUser && !authUser.email_confirmed_at) {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      })

      if (resendError) {
        return { success: false, error: resendError.message }
      }
    } else if (authUser) {
      return {
        success: false,
        error:
          'This email already has a confirmed account. Ask the client to sign in or send a password reset instead.',
      }
    } else {
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,
          data: {
            full_name: client.full_name,
            role: 'client',
            invite_token: token,
          },
        }
      )

      if (inviteError) {
        return { success: false, error: inviteError.message }
      }
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not send activation email.',
    }
  }

  revalidateClients()
  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

export async function shareClientWithGym(
  clientId: string,
  gymId: string
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const gymContext = await getGymMembershipForCoach(user.id, gymId)

  if (!gymContext) {
    return { success: false, error: 'You must be a member of this gym to add clients.' }
  }

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, coach_id, is_coach_self')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  if (client.is_coach_self) {
    return { success: false, error: 'This profile cannot be added as a gym member.' }
  }

  const { error } = await supabase
    .from('clients')
    .update({ gym_id: gymContext.gym.id })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

export async function unshareClientFromGym(clientId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('clients')
    .update({ gym_id: null })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

export type ShareAllClientsResult =
  | { success: true; count: number }
  | { success: false; error: string }

export async function shareAllClientsWithGym(
  gymId: string
): Promise<ShareAllClientsResult> {
  const { supabase, user } = await requireUser()
  const gymContext = await getGymMembershipForCoach(user.id, gymId)

  if (!gymContext) {
    return { success: false, error: 'You must be a member of this gym to add clients.' }
  }

  const { data, error } = await supabase
    .from('clients')
    .update({ gym_id: gymContext.gym.id })
    .eq('coach_id', user.id)
    .eq('is_coach_self', false)
    .select('id')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  return { success: true, count: data?.length ?? 0 }
}
