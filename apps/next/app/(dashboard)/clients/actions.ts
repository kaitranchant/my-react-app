'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { CLIENT_INVITE_EXPIRY_DAYS } from '@/lib/constants'
import { buildClientInviteUrl } from '@/lib/invite'
import {
  clientFormSchema,
  clientNotesSchema,
  clientStatuses,
  inviteClientSchema,
  type ClientFormValues,
  type InviteClientValues,
} from '@/lib/validations/client'
import type { ClientStatus } from 'app/types/database'

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
    goal: values.goal ? values.goal : null,
    notes: values.notes ? values.notes : null,
  }
}

function revalidateClients() {
  revalidatePath('/clients')
  revalidatePath('/dashboard')
}

export async function createClientRecord(
  values: ClientFormValues
): Promise<CreateClientResult> {
  const parsed = clientFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...toRow(parsed.data), coach_id: user.id })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Could not create client.' }
  }

  revalidateClients()
  return { success: true, clientId: data.id }
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
  const { data, error } = await supabase
    .from('clients')
    .insert({
      coach_id: user.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
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
