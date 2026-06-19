'use server'

import { revalidatePath } from 'next/cache'

import { inbodyValuesToRow, inbodyValuesToUpdate } from '@/lib/inbody-scans'
import { requirePortalClientContext } from '@/lib/portal-client'
import { formatSupabaseError } from '@/lib/supabase/errors'
import {
  inbodyScanFormSchema,
  type InbodyScanFormValues,
} from '@/lib/validations/inbody-scan'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidatePortalInbody(clientId: string) {
  revalidatePath('/portal/inbody')
  revalidatePath('/portal/progress')
  revalidatePath('/portal', 'layout')
  revalidatePath(`/clients/${clientId}`)
}

export async function submitClientInbodyScan(
  values: InbodyScanFormValues
): Promise<ActionResult> {
  const parsed = inbodyScanFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: coachClient, error: clientError } = await ctx.supabase
    .from('clients')
    .select('coach_id')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !coachClient?.coach_id) {
    return { success: false, error: 'Client profile not found.' }
  }

  const row = inbodyValuesToRow(
    parsed.data,
    ctx.client.id,
    coachClient.coach_id,
    'client'
  )

  const { error } = await ctx.supabase.from('client_inbody_scans').insert(row)

  if (error) {
    return { success: false, error: formatSupabaseError(error) }
  }

  revalidatePortalInbody(ctx.client.id)
  return { success: true }
}

export async function updateClientInbodyScan(
  scanId: string,
  values: InbodyScanFormValues
): Promise<ActionResult> {
  const parsed = inbodyScanFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: existing, error: fetchError } = await ctx.supabase
    .from('client_inbody_scans')
    .select('id')
    .eq('id', scanId)
    .eq('client_id', ctx.client.id)
    .eq('submitted_by', 'client')
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Scan not found.' }
  }

  const { error } = await ctx.supabase
    .from('client_inbody_scans')
    .update(inbodyValuesToUpdate(parsed.data))
    .eq('id', scanId)
    .eq('client_id', ctx.client.id)

  if (error) {
    return { success: false, error: formatSupabaseError(error) }
  }

  revalidatePortalInbody(ctx.client.id)
  return { success: true }
}

export async function deleteClientInbodyScan(scanId: string): Promise<ActionResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: existing, error: fetchError } = await ctx.supabase
    .from('client_inbody_scans')
    .select('id')
    .eq('id', scanId)
    .eq('client_id', ctx.client.id)
    .eq('submitted_by', 'client')
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Scan not found.' }
  }

  const { error } = await ctx.supabase
    .from('client_inbody_scans')
    .delete()
    .eq('id', scanId)
    .eq('client_id', ctx.client.id)

  if (error) {
    return { success: false, error: formatSupabaseError(error) }
  }

  revalidatePortalInbody(ctx.client.id)
  return { success: true }
}
