'use server'

import { revalidatePath } from 'next/cache'

import { inbodyValuesToRow, inbodyValuesToUpdate } from '@/lib/inbody-scans'
import { createClient } from '@/lib/supabase/server'
import {
  inbodyScanFormSchema,
  type InbodyScanFormValues,
} from '@/lib/validations/inbody-scan'

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

async function requireCoachClient(clientId: string) {
  const { supabase, user } = await requireUser()
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, coach_id')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !client) {
    return null
  }

  return { supabase, user, client }
}

function revalidateInbodyPaths(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal/inbody')
  revalidatePath('/portal/progress')
  revalidatePath('/portal', 'layout')
}

export async function submitCoachInbodyScan(
  clientId: string,
  values: InbodyScanFormValues
): Promise<ActionResult> {
  const parsed = inbodyScanFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireCoachClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const row = inbodyValuesToRow(
    parsed.data,
    clientId,
    ctx.user.id,
    'coach'
  )

  const { error } = await ctx.supabase.from('client_inbody_scans').insert(row)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateInbodyPaths(clientId)
  return { success: true }
}

export async function updateCoachInbodyScan(
  scanId: string,
  values: InbodyScanFormValues
): Promise<ActionResult> {
  const parsed = inbodyScanFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data: existing, error: fetchError } = await supabase
    .from('client_inbody_scans')
    .select('id, client_id')
    .eq('id', scanId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Scan not found.' }
  }

  const { error } = await supabase
    .from('client_inbody_scans')
    .update(inbodyValuesToUpdate(parsed.data))
    .eq('id', scanId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateInbodyPaths(existing.client_id)
  return { success: true }
}

export async function deleteCoachInbodyScan(scanId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const { data: existing, error: fetchError } = await supabase
    .from('client_inbody_scans')
    .select('id, client_id')
    .eq('id', scanId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Scan not found.' }
  }

  const { error } = await supabase
    .from('client_inbody_scans')
    .delete()
    .eq('id', scanId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateInbodyPaths(existing.client_id)
  return { success: true }
}
