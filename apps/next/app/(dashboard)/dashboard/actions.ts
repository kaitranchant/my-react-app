'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { ProactiveAlertKind } from '@/lib/proactive-alerts'

export type ActionResult = { success: true } | { success: false; error: string }

const ALERT_KINDS = new Set<ProactiveAlertKind>([
  'inactive',
  'acwr',
  'injury',
  'check_in',
])

async function requireCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in.' as const }
  }

  return { supabase, coachId: user.id }
}

async function verifyClientAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  clientId: string
) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('coach_id', coachId)
    .maybeSingle()

  return !error && Boolean(client)
}

export async function dismissProactiveAlert(input: {
  alertId: string
  kind: ProactiveAlertKind
  signature: string
  clientId?: string | null
}): Promise<ActionResult> {
  const alertId = input.alertId.trim()
  const signature = input.signature.trim()
  const clientId = input.clientId?.trim() || null

  if (!alertId || !signature) {
    return { success: false, error: 'Invalid alert.' }
  }

  if (!ALERT_KINDS.has(input.kind)) {
    return { success: false, error: 'Invalid alert kind.' }
  }

  const auth = await requireCoach()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { supabase, coachId } = auth

  if (clientId) {
    const allowed = await verifyClientAccess(supabase, coachId, clientId)
    if (!allowed) {
      return { success: false, error: 'Client not found.' }
    }
  }

  const { error } = await supabase.from('coach_proactive_alert_dismissals').upsert(
    {
      coach_id: coachId,
      alert_id: alertId,
      kind: input.kind,
      client_id: clientId,
      signature,
      dismissed_at: new Date().toISOString(),
    },
    { onConflict: 'coach_id,alert_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function undoDismissProactiveAlert(
  alertId: string
): Promise<ActionResult> {
  const trimmedAlertId = alertId.trim()
  if (!trimmedAlertId) {
    return { success: false, error: 'Invalid alert.' }
  }

  const auth = await requireCoach()
  if ('error' in auth) {
    return { success: false, error: auth.error }
  }

  const { supabase, coachId } = auth
  const { error } = await supabase
    .from('coach_proactive_alert_dismissals')
    .delete()
    .eq('coach_id', coachId)
    .eq('alert_id', trimmedAlertId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
