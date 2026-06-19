'use server'

import { revalidatePath } from 'next/cache'

import { checkInValuesToRow, checkInValuesToUpdate } from '@/lib/check-ins'
import { createClient } from '@/lib/supabase/server'
import {
  checkInFormSchema,
  coachNotesSchema,
  type CheckInFormValues,
} from '@/lib/validations/check-in'

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

function revalidateCheckInPaths(clientId: string) {
  revalidatePath('/check-ins')
  revalidatePath('/dashboard')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal', 'layout')
}

export async function submitCoachCheckIn(
  clientId: string,
  values: CheckInFormValues
): Promise<ActionResult> {
  const parsed = checkInFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireCoachClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const row = checkInValuesToRow(
    parsed.data,
    clientId,
    ctx.user.id,
    'coach'
  )

  const reviewedAt =
    parsed.data.coachNotes != null ? new Date().toISOString() : null

  const { error } = await ctx.supabase.from('client_check_ins').upsert(
    {
      ...row,
      reviewed_at: reviewedAt,
    },
    { onConflict: 'client_id,check_in_date' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateCheckInPaths(clientId)
  return { success: true }
}

export async function updateCheckInCoachNotes(
  checkInId: string,
  coachNotes: string | null
): Promise<ActionResult> {
  const parsed = coachNotesSchema.safeParse({ coachNotes })
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data: existing, error: fetchError } = await supabase
    .from('client_check_ins')
    .select('id, client_id')
    .eq('id', checkInId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Check-in not found.' }
  }

  const { error } = await supabase
    .from('client_check_ins')
    .update({
      coach_notes: parsed.data.coachNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', checkInId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateCheckInPaths(existing.client_id)
  return { success: true }
}

export async function updateCoachCheckIn(
  checkInId: string,
  values: CheckInFormValues
): Promise<ActionResult> {
  const parsed = checkInFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data: existing, error: fetchError } = await supabase
    .from('client_check_ins')
    .select('id, client_id')
    .eq('id', checkInId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Check-in not found.' }
  }

  const reviewedAt =
    parsed.data.coachNotes != null
      ? new Date().toISOString()
      : null

  const { error } = await supabase
    .from('client_check_ins')
    .update({
      ...checkInValuesToUpdate(parsed.data),
      reviewed_at: reviewedAt,
    })
    .eq('id', checkInId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateCheckInPaths(existing.client_id)
  return { success: true }
}

export async function deleteCoachCheckIn(checkInId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const { data: existing, error: fetchError } = await supabase
    .from('client_check_ins')
    .select('id, client_id')
    .eq('id', checkInId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (fetchError || !existing) {
    return { success: false, error: 'Check-in not found.' }
  }

  const { error } = await supabase
    .from('client_check_ins')
    .delete()
    .eq('id', checkInId)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateCheckInPaths(existing.client_id)
  return { success: true }
}
