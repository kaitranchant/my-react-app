'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  clientFormSchema,
  clientNotesSchema,
  clientStatuses,
  type ClientFormValues,
} from '@/lib/validations/client'
import type { ClientStatus } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

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
): Promise<ActionResult> {
  const parsed = clientFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('clients')
    .insert({ ...toRow(parsed.data), coach_id: user.id })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateClients()
  return { success: true }
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
