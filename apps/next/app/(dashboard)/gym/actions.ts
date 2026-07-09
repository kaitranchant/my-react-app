'use server'

import { revalidatePath } from 'next/cache'

import { formatGymInviteLinkError } from '@/lib/auth/errors'
import { ensureGymCoachPortalMembership } from '@/lib/gym-coach-client'
import { CLIENT_INVITE_EXPIRY_DAYS } from '@/lib/constants'
import { getAppBaseUrl } from '@/lib/email/config'
import {
  getGymMembershipForCoach,
  requireUser,
} from '@/lib/gym-access'
import {
  buildGymJoinUrl,
} from '@/lib/invite'
import {
  assertCanCreateGym,
  countGymCoachSeats,
  getCoachSubscriptionContext,
  getGymSubscription,
  hasActiveFacilitySubscription,
  canInviteGymCoach,
} from '@/lib/subscription-entitlements'
import {
  gymFormSchema,
  inviteCoachSchema,
  type GymFormValues,
  type InviteCoachValues,
} from '@/lib/validations/gym'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateGymResult =
  | { success: true; gymId: string }
  | { success: false; error: string }

export type InviteCoachResult =
  | { success: true; inviteUrl: string }
  | { success: false; error: string }

function inviteExpiresAt() {
  const expires = new Date()
  expires.setDate(expires.getDate() + CLIENT_INVITE_EXPIRY_DAYS)
  return expires.toISOString()
}

function revalidateGym() {
  revalidatePath('/gym')
  revalidatePath('/clients')
  revalidatePath('/dashboard')
}

async function requireGymOwner(gymId: string) {
  const { supabase, user } = await requireUser()
  const gymContext = await getGymMembershipForCoach(user.id, gymId)

  if (!gymContext || gymContext.membership.role !== 'owner') {
    return {
      supabase,
      user,
      gymContext: null,
      error: 'Only the gym owner can perform this action.' as const,
    }
  }

  return { supabase, user, gymContext, error: null }
}

export async function createGymRecord(
  values: GymFormValues
): Promise<CreateGymResult> {
  const parsed = gymFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()

  const subscriptionContext = await getCoachSubscriptionContext(supabase, user.id)
  const gymAccess = assertCanCreateGym(subscriptionContext)
  if (!gymAccess.ok) {
    return { success: false, error: gymAccess.error }
  }

  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .insert({
      name: parsed.data.name,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (gymError || !gym) {
    return { success: false, error: gymError?.message ?? 'Could not create gym.' }
  }

  const { error: memberError } = await supabase.from('gym_members').insert({
    gym_id: gym.id,
    coach_id: user.id,
    role: 'owner',
    status: 'active',
  })

  if (memberError) {
    await supabase.from('gyms').delete().eq('id', gym.id)
    return { success: false, error: memberError.message }
  }

  if (subscriptionContext.personalPlan === 'facility') {
    const { data: billingProfile } = await supabase
      .from('profiles')
      .select(
        'stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end'
      )
      .eq('id', user.id)
      .single()

    await supabase.from('gym_subscriptions').insert({
      gym_id: gym.id,
      plan: 'facility',
      status: billingProfile?.subscription_status ?? 'active',
      stripe_customer_id: billingProfile?.stripe_customer_id ?? null,
      stripe_subscription_id: billingProfile?.stripe_subscription_id ?? null,
      current_period_end: billingProfile?.subscription_current_period_end ?? null,
    })
  }

  revalidateGym()
  return { success: true, gymId: gym.id }
}

export async function updateGymRecord(
  gymId: string,
  values: GymFormValues
): Promise<ActionResult> {
  const parsed = gymFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, gymContext, error } = await requireGymOwner(gymId)
  if (error || !gymContext) {
    return { success: false, error: error ?? 'Gym not found.' }
  }

  const { error: updateError } = await supabase
    .from('gyms')
    .update({ name: parsed.data.name })
    .eq('id', gymContext.gym.id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidateGym()
  return { success: true }
}

export async function inviteCoachToGym(
  gymId: string,
  values: InviteCoachValues
): Promise<InviteCoachResult> {
  const parsed = inviteCoachSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid email.',
    }
  }

  const { supabase, user, gymContext, error } = await requireGymOwner(gymId)
  if (error || !gymContext) {
    return { success: false, error: error ?? 'Gym not found.' }
  }

  const gymSubscription = await getGymSubscription(supabase, gymContext.gym.id)
  if (!hasActiveFacilitySubscription(gymSubscription)) {
    return {
      success: false,
      error:
        'Coach invites require an active Facility subscription. View pricing to upgrade.',
    }
  }

  const seatCount = await countGymCoachSeats(supabase, gymContext.gym.id)
  if (!canInviteGymCoach(seatCount, gymSubscription)) {
    return {
      success: false,
      error: 'Could not invite coach. Check your Facility subscription.',
    }
  }

  const email = parsed.data.email.toLowerCase()

  const { data: existingInvite } = await supabase
    .from('gym_invites')
    .select('id')
    .eq('gym_id', gymContext.gym.id)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInvite) {
    return { success: false, error: 'An invite is already pending for this email.' }
  }

  const token = crypto.randomUUID()
  const { data: invite, error: inviteError } = await supabase
    .from('gym_invites')
    .insert({
      gym_id: gymContext.gym.id,
      email,
      invite_token: token,
      invited_by: user.id,
      expires_at: inviteExpiresAt(),
    })
    .select('invite_token')
    .single()

  if (inviteError || !invite) {
    return { success: false, error: inviteError?.message ?? 'Could not send invite.' }
  }

  const origin = getAppBaseUrl()
  revalidateGym()
  return {
    success: true,
    inviteUrl: buildGymJoinUrl(invite.invite_token, origin),
  }
}

export async function revokeGymInvite(
  gymId: string,
  inviteId: string
): Promise<ActionResult> {
  const { supabase, gymContext, error } = await requireGymOwner(gymId)
  if (error || !gymContext) {
    return { success: false, error: error ?? 'Gym not found.' }
  }

  const { error: updateError } = await supabase
    .from('gym_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('gym_id', gymContext.gym.id)
    .eq('status', 'pending')

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidateGym()
  return { success: true }
}

export async function removeGymMember(
  gymId: string,
  memberId: string
): Promise<ActionResult> {
  const { supabase, user, gymContext, error } = await requireGymOwner(gymId)
  if (error || !gymContext) {
    return { success: false, error: error ?? 'Gym not found.' }
  }

  const { data: member } = await supabase
    .from('gym_members')
    .select('id, coach_id, role')
    .eq('id', memberId)
    .eq('gym_id', gymContext.gym.id)
    .maybeSingle()

  if (!member) {
    return { success: false, error: 'Member not found.' }
  }

  if (member.role === 'owner') {
    return { success: false, error: 'Cannot remove the gym owner.' }
  }

  if (member.coach_id === user.id) {
    return { success: false, error: 'Use leave gym to remove yourself.' }
  }

  const { error: deleteError } = await supabase
    .from('gym_members')
    .delete()
    .eq('id', memberId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  revalidateGym()
  return { success: true }
}

export async function leaveGym(gymId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const gymContext = await getGymMembershipForCoach(user.id, gymId)

  if (!gymContext) {
    return { success: false, error: 'You are not a member of this gym.' }
  }

  if (gymContext.membership.role === 'owner') {
    return {
      success: false,
      error: 'Transfer ownership or delete the gym before leaving.',
    }
  }

  const { error } = await supabase
    .from('gym_members')
    .delete()
    .eq('id', gymContext.membership.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateGym()
  return { success: true }
}

export async function deleteGymRecord(gymId: string): Promise<ActionResult> {
  const { supabase, gymContext, error } = await requireGymOwner(gymId)
  if (error || !gymContext) {
    return { success: false, error: error ?? 'Gym not found.' }
  }

  const { error: deleteError } = await supabase
    .from('gyms')
    .delete()
    .eq('id', gymContext.gym.id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  revalidateGym()
  return { success: true }
}

export async function acceptGymInvite(
  token: string
): Promise<{ success: true; gymId: string } | { success: false; error: string }> {
  const { supabase, user } = await requireUser()

  const { data, error } = await supabase.rpc('link_gym_invite', {
    p_token: token,
    p_user_id: user.id,
    p_email: user.email ?? '',
  })

  if (error) {
    return { success: false, error: formatGymInviteLinkError(error.message) }
  }

  const gymId = data as string
  await ensureGymCoachPortalMembership(supabase, gymId)

  revalidateGym()
  return { success: true, gymId }
}

export async function getGymInviteLink(
  gymId: string,
  inviteId: string
): Promise<InviteCoachResult> {
  const { supabase, gymContext, error } = await requireGymOwner(gymId)
  if (error || !gymContext) {
    return { success: false, error: error ?? 'Gym not found.' }
  }

  const { data: invite, error: fetchError } = await supabase
    .from('gym_invites')
    .select('invite_token')
    .eq('id', inviteId)
    .eq('gym_id', gymContext.gym.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (fetchError || !invite) {
    return { success: false, error: 'Invite not found.' }
  }

  const origin = getAppBaseUrl()
  return {
    success: true,
    inviteUrl: buildGymJoinUrl(invite.invite_token, origin),
  }
}
