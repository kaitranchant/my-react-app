'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { CLIENT_INVITE_EXPIRY_DAYS } from '@/lib/constants'
import {
  getGymMembershipForCoach,
  requireUser,
} from '@/lib/gym-access'
import {
  buildGymInviteUrl,
  buildGymJoinUrl,
} from '@/lib/invite'
import { createClient } from '@/lib/supabase/server'
import {
  gymFormSchema,
  inviteCoachSchema,
  type GymFormValues,
  type InviteCoachValues,
} from '@/lib/validations/gym'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateGymResult =
  | { success: true; gymId: string }
  | { success: false; error: string }

export type InviteCoachResult =
  | { success: true; inviteUrl: string }
  | { success: false; error: string }

async function getOrigin() {
  return (await headers()).get('origin') ?? ''
}

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

  const origin = await getOrigin()
  revalidateGym()
  return {
    success: true,
    inviteUrl: buildGymInviteUrl(invite.invite_token, origin),
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
    return { success: false, error: error.message }
  }

  revalidateGym()
  return { success: true, gymId: data as string }
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

  const origin = await getOrigin()
  return {
    success: true,
    inviteUrl: buildGymJoinUrl(invite.invite_token, origin),
  }
}
