'use server'

import { revalidatePath } from 'next/cache'

import { syncClientLimitResolutionFlag } from '@/lib/client-limit-resolution'
import { requireUser } from '@/lib/gym-access'
import { getCoachSubscriptionContext } from '@/lib/subscription-entitlements'
import { PLAN_LABELS } from '@/lib/subscription-plans'
import type { Client } from 'app/types/database'

export type ClientLimitResolutionState =
  | {
      required: false
    }
  | {
      required: true
      clientLimit: number
      billableClientCount: number
      planLabel: string
      clients: Array<
        Pick<Client, 'id' | 'full_name' | 'email' | 'avatar_url' | 'status'>
      >
    }

export async function fetchClientLimitResolutionState(): Promise<ClientLimitResolutionState> {
  const { supabase, user } = await requireUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('needs_client_limit_resolution')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.needs_client_limit_resolution) {
    return { required: false }
  }

  const context = await getCoachSubscriptionContext(supabase, user.id)
  if (
    context.clientLimit == null ||
    context.billableClientCount <= context.clientLimit
  ) {
    await supabase
      .from('profiles')
      .update({ needs_client_limit_resolution: false })
      .eq('id', user.id)
    return { required: false }
  }

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, email, avatar_url, status')
    .eq('coach_id', user.id)
    .eq('is_coach_self', false)
    .neq('status', 'archived')
    .order('full_name', { ascending: true })

  return {
    required: true,
    clientLimit: context.clientLimit,
    billableClientCount: context.billableClientCount,
    planLabel: PLAN_LABELS[context.personalPlan],
    clients: clients ?? [],
  }
}

export type ResolveClientLimitResult =
  | { success: true }
  | { success: false; error: string }

export async function resolveClientLimitByKeepingClients(
  keepClientIds: string[]
): Promise<ResolveClientLimitResult> {
  const { supabase, user } = await requireUser()
  const context = await getCoachSubscriptionContext(supabase, user.id)

  if (context.clientLimit == null) {
    await supabase
      .from('profiles')
      .update({ needs_client_limit_resolution: false })
      .eq('id', user.id)
    return { success: true }
  }

  const uniqueKeep = Array.from(new Set(keepClientIds))
  if (uniqueKeep.length > context.clientLimit) {
    return {
      success: false,
      error: `Keep at most ${context.clientLimit} clients on your current plan.`,
    }
  }

  const { data: activeClients, error: listError } = await supabase
    .from('clients')
    .select('id')
    .eq('coach_id', user.id)
    .eq('is_coach_self', false)
    .neq('status', 'archived')

  if (listError) {
    return { success: false, error: listError.message }
  }

  const activeIds = new Set((activeClients ?? []).map((row) => row.id))
  for (const id of uniqueKeep) {
    if (!activeIds.has(id)) {
      return { success: false, error: 'One or more selected clients are invalid.' }
    }
  }

  const archiveIds = (activeClients ?? [])
    .map((row) => row.id)
    .filter((id) => !uniqueKeep.includes(id))

  if (archiveIds.length > 0) {
    const { error: archiveError } = await supabase
      .from('clients')
      .update({ status: 'archived' })
      .in('id', archiveIds)
      .eq('coach_id', user.id)

    if (archiveError) {
      return { success: false, error: archiveError.message }
    }
  }

  await syncClientLimitResolutionFlag(supabase, user.id)

  revalidatePath('/clients')
  revalidatePath('/dashboard')
  revalidatePath('/billing')
  return { success: true }
}
