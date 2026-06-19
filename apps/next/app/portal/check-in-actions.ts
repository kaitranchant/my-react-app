'use server'

import { revalidatePath } from 'next/cache'

import { checkInValuesToRow, checkInMetricValues } from '@/lib/check-ins'
import { requirePortalClientContext } from '@/lib/portal-client'
import { formatSupabaseError } from '@/lib/supabase/errors'
import {
  clientCheckInFormSchema,
  type ClientCheckInFormValues,
} from '@/lib/validations/check-in'
import type { ClientCheckIn } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type ClientCheckInResult =
  | { success: true; data: ClientCheckIn | null }
  | { success: false; error: string }

function revalidatePortalCheckIn(clientId: string) {
  revalidatePath('/portal', 'layout')
  revalidatePath('/portal/progress')
  revalidatePath('/check-ins')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function submitClientCheckIn(
  values: ClientCheckInFormValues
): Promise<ActionResult> {
  const parsed = clientCheckInFormSchema.safeParse(values)
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

  const { data: existing } = await ctx.supabase
    .from('client_check_ins')
    .select('id, reviewed_at, submitted_by')
    .eq('client_id', ctx.client.id)
    .eq('check_in_date', parsed.data.checkInDate)
    .maybeSingle()

  if (existing?.reviewed_at) {
    return {
      success: false,
      error: 'This check-in has already been reviewed and cannot be edited.',
    }
  }

  const row = checkInValuesToRow(
    { ...parsed.data, coachNotes: null },
    ctx.client.id,
    coachClient.coach_id,
    'client'
  )

  if (existing) {
    const { error } = await ctx.supabase
      .from('client_check_ins')
      .update({
        ...checkInMetricValues({ ...parsed.data, coachNotes: null }),
        client_notes: parsed.data.clientNotes,
      })
      .eq('id', existing.id)
      .eq('client_id', ctx.client.id)

    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }
  } else {
    const { error } = await ctx.supabase.from('client_check_ins').insert(row)
    if (error) {
      return { success: false, error: formatSupabaseError(error) }
    }
  }

  revalidatePortalCheckIn(ctx.client.id)
  return { success: true }
}

export async function getClientCheckInForDate(
  dateKey: string
): Promise<ClientCheckInResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data, error } = await ctx.supabase
    .from('client_check_ins')
    .select('*')
    .eq('client_id', ctx.client.id)
    .eq('check_in_date', dateKey)
    .maybeSingle()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: (data as ClientCheckIn | null) ?? null }
}
