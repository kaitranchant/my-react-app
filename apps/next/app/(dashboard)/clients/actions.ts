'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { CLIENT_INVITE_EXPIRY_DAYS } from '@/lib/constants'
import { sendClientInviteEmail } from '@/lib/email/client-invite'
import { isCoachClientNotificationEnabled } from '@/lib/coach-client-notification-preferences'
import { getAppBaseUrl } from '@/lib/email/config'
import { getCoachGymAccessMode, getGymMembershipForCoach, getGymIdsForCoach, isGymInvitedOnlyCoach } from '@/lib/gym-access'
import { buildClientInviteUrl } from '@/lib/invite'
import {
  clientFormSchema,
  clientNotesSchema,
  clientStatuses,
  inviteClientSchema,
  type ClientFormValues,
  type InviteClientValues,
} from '@/lib/validations/client'
import type { ClientCoachingType, ClientStatus, Client } from 'app/types/database'
import { getCoachSubscriptionContext, assertCanAddClient } from '@/lib/subscription-entitlements'

export type ActionResult = { success: true } | { success: false; error: string }

export type ActivationEmailResult =
  | { success: true }
  | { success: false; error: string; inviteUrl?: string }

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
    biological_sex:
      values.biologicalSex && values.biologicalSex !== 'none'
        ? values.biologicalSex
        : null,
    leaderboard_opt_out: values.leaderboardOptOut ?? false,
    weekly_session_target: values.weeklySessionTarget ?? null,
    progressive_overload_enabled: values.progressiveOverloadEnabled ?? false,
  }
}

function biologicalSexFromForm(
  value: ClientFormValues['biologicalSex'] | InviteClientValues['biologicalSex']
): 'male' | 'female' | null {
  return value && value !== 'none' ? value : null
}

async function resolveGymIdForCreate(
  userId: string,
  gymId?: string
): Promise<{ gymId: string | null } | { error: string }> {
  const gymInvitedOnly = isGymInvitedOnlyCoach(await getCoachGymAccessMode(userId))

  if (!gymId || gymId === 'none') {
    if (gymInvitedOnly) {
      return {
        error: 'Invited gym coaches must add clients to a gym roster.',
      }
    }
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
      error: 'Coach profiles cannot be edited from the users list.',
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

  const subscriptionContext = await getCoachSubscriptionContext(supabase, user.id)
  const clientLimitCheck = assertCanAddClient(subscriptionContext)
  if (!clientLimitCheck.ok) {
    return { success: false, error: clientLimitCheck.error }
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

  const row = toRow(parsed.data)
  const { error: profileError } = await supabase
    .from('clients')
    .update({
      biological_sex: row.biological_sex,
      leaderboard_opt_out: row.leaderboard_opt_out,
      weekly_session_target: row.weekly_session_target,
    })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  revalidateClients()
  revalidatePath('/leaderboards')
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
  revalidatePath('/leaderboards')
  revalidatePath('/portal/leaderboards')
  return { success: true }
}

export type FetchClientForEditResult =
  | { success: true; client: Client }
  | { success: false; error: string }

export async function fetchClientForEdit(
  id: string
): Promise<FetchClientForEditResult> {
  const { supabase } = await requireUser()
  const blocked = await rejectCoachSelfClientMutation(supabase, id)
  if (blocked && !blocked.success) {
    return blocked
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data) {
    return { success: false, error: 'Client not found.' }
  }

  return { success: true, client: data as Client }
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

  const subscriptionContext = await getCoachSubscriptionContext(supabase, user.id)
  const clientLimitCheck = assertCanAddClient(subscriptionContext)
  if (!clientLimitCheck.ok) {
    return { success: false, error: clientLimitCheck.error }
  }

  const { data: clientId, error } = await supabase.rpc('coach_create_client', {
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email,
    p_phone: '',
    p_status: 'active',
    p_coaching_type: coachingTypeForInsert(parsed.data.coachingType),
    p_gym_id: gymResult.gymId,
    p_goal: parsed.data.goal ?? '',
    p_notes: '',
  })

  if (error || !clientId) {
    return { success: false, error: error?.message ?? 'Could not create invite.' }
  }

  const { error: inviteError } = await supabase
    .from('clients')
    .update({
      invite_status: 'pending',
      invite_token: token,
      invite_expires_at: inviteExpiresAt(),
      biological_sex: biologicalSexFromForm(parsed.data.biologicalSex),
      leaderboard_opt_out: parsed.data.leaderboardOptOut ?? false,
    })
    .eq('id', clientId)
    .eq('coach_id', user.id)

  if (inviteError) {
    return { success: false, error: inviteError.message }
  }

  revalidateClients()
  revalidatePath('/leaderboards')
  const origin = getAppBaseUrl()
  return {
    success: true,
    inviteUrl: buildClientInviteUrl(token, origin),
    clientId,
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
  const origin = getAppBaseUrl()
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
    .select(
      'invite_token, invite_status, invite_expires_at, user_id, email'
    )
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !client) {
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
      error: 'Add an email to this client before generating an invite link.',
    }
  }

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

    revalidateClients()
    revalidatePath(`/clients/${clientId}`)
  }

  const origin = getAppBaseUrl()
  return {
    success: true,
    inviteUrl: buildClientInviteUrl(token, origin),
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

export async function updateClientOnboardingAssessmentNotes(
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
    .update({
      onboarding_assessment_notes: parsed.data ? parsed.data : null,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/clients/${id}`)
  return { success: true }
}

export async function updateClientProfileField(
  id: string,
  field: 'goal' | 'phone',
  value: string
): Promise<ActionResult> {
  const trimmed = value.trim()

  if (field === 'goal' && trimmed.length > 500) {
    return { success: false, error: 'Goal is too long.' }
  }

  if (field === 'phone' && trimmed.length > 40) {
    return { success: false, error: 'Phone is too long.' }
  }

  const { supabase } = await requireUser()
  const blocked = await rejectCoachSelfClientMutation(supabase, id)
  if (blocked) {
    return blocked
  }

  const nextValue = trimmed ? trimmed : null
  const updatePayload =
    field === 'goal'
      ? { goal: nextValue }
      : { phone: nextValue }

  const { error } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  revalidatePath(`/clients/${id}`)
  return { success: true }
}

export async function bulkSetClientStatus(
  clientIds: string[],
  status: ClientStatus
): Promise<ActionResult & { count?: number }> {
  const uniqueIds = Array.from(new Set(clientIds))

  if (uniqueIds.length === 0) {
    return { success: false, error: 'Select at least one client.' }
  }

  if (!clientStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' }
  }

  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('clients')
    .update({ status })
    .eq('coach_id', user.id)
    .eq('is_coach_self', false)
    .in('id', uniqueIds)
    .select('id')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  for (const client of data ?? []) {
    revalidatePath(`/clients/${client.id}`)
  }

  return { success: true, count: data?.length ?? 0 }
}

export async function bulkDeleteClientRecords(
  clientIds: string[]
): Promise<ActionResult & { count?: number }> {
  const uniqueIds = Array.from(new Set(clientIds))

  if (uniqueIds.length === 0) {
    return { success: false, error: 'Select at least one client.' }
  }

  const { supabase, user } = await requireUser()

  const { data, error } = await supabase
    .from('clients')
    .delete()
    .eq('coach_id', user.id)
    .eq('is_coach_self', false)
    .in('id', uniqueIds)
    .select('id')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  return { success: true, count: data?.length ?? 0 }
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

  const origin = getAppBaseUrl()
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
): Promise<ActivationEmailResult> {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, business_name')
    .eq('id', user.id)
    .maybeSingle()

  const coachName =
    profile?.full_name?.trim() ||
    profile?.business_name?.trim() ||
    'Your coach'

  const inviteUrl = buildClientInviteUrl(token, getAppBaseUrl())

  const invitesEnabled = await isCoachClientNotificationEnabled(
    user.id,
    'sendClientInvites'
  )
  if (!invitesEnabled) {
    return {
      success: false,
      error:
        'Portal invite emails are turned off in Settings → Notifications → Notifications to clients.',
      inviteUrl,
    }
  }

  const emailResult = await sendClientInviteEmail({
    clientName: client.full_name,
    clientEmail: email,
    coachName,
    inviteUrl,
  })

  if (!emailResult.ok) {
    return {
      success: false,
      error: emailResult.error,
      inviteUrl,
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

export async function shareClientsWithGym(
  gymId: string,
  clientIds: string[]
): Promise<ShareAllClientsResult> {
  const uniqueIds = Array.from(new Set(clientIds))

  if (uniqueIds.length === 0) {
    return { success: false, error: 'Select at least one client.' }
  }

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
    .in('id', uniqueIds)
    .select('id')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  for (const client of data ?? []) {
    revalidatePath(`/clients/${client.id}`)
  }
  return { success: true, count: data?.length ?? 0 }
}

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
