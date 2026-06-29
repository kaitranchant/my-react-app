import type { SupabaseClient } from '@supabase/supabase-js'

import {
  FACILITY_INCLUDED_COACH_SEATS,
  GROWTH_CLIENT_LIMIT,
  getMinimumPlanForFeature,
  planMeetsRequirement,
  STARTER_CLIENT_LIMIT,
  type SubscriptionFeature,
} from '@/lib/subscription-plans'
import { isEntitledSubscriptionStatus } from '@/lib/stripe/sync'
import type {
  Database,
  SubscriptionPlan,
  SubscriptionStatus,
} from 'app/types/database'

type DbClient = SupabaseClient<Database>

export type CoachSubscriptionContext = {
  coachId: string
  personalPlan: SubscriptionPlan
  effectivePlan: SubscriptionPlan
  inPaidFacility: boolean
  ownedFacilityGymIds: string[]
  facilityGymIds: string[]
  billableClientCount: number
  clientLimit: number | null
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing'])

function maxPlan(a: SubscriptionPlan, b: SubscriptionPlan): SubscriptionPlan {
  const rank: Record<SubscriptionPlan, number> = {
    starter: 0,
    growth: 1,
    scale: 2,
    facility: 3,
  }
  return rank[a] >= rank[b] ? a : b
}

function clientLimitForPlan(plan: SubscriptionPlan): number | null {
  if (plan === 'starter') return STARTER_CLIENT_LIMIT
  if (plan === 'growth') return GROWTH_CLIENT_LIMIT
  return null
}

function resolvePersonalPlan(
  plan: SubscriptionPlan | null | undefined,
  status: SubscriptionStatus | null | undefined
): SubscriptionPlan {
  const resolved = (plan ?? 'starter') as SubscriptionPlan
  if (resolved === 'starter') return 'starter'
  if (isEntitledSubscriptionStatus(status)) {
    return resolved
  }
  return 'starter'
}

export async function getCoachSubscriptionContext(
  supabase: DbClient,
  coachId: string
): Promise<CoachSubscriptionContext> {
  const [
    { data: profile },
    { count: billableClientCount },
    { data: gymMemberships },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('subscription_plan, subscription_status')
      .eq('id', coachId)
      .maybeSingle(),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('is_coach_self', false)
      .neq('status', 'archived'),
    supabase
      .from('gym_members')
      .select('gym_id, role, status')
      .eq('coach_id', coachId)
      .eq('status', 'active'),
  ])

  const personalPlan = resolvePersonalPlan(
    profile?.subscription_plan as SubscriptionPlan | undefined,
    profile?.subscription_status as SubscriptionStatus | null | undefined
  )

  const gymIds = (gymMemberships ?? []).map((row) => row.gym_id)
  const ownedFacilityGymIds = (gymMemberships ?? [])
    .filter((row) => row.role === 'owner')
    .map((row) => row.gym_id)

  let facilityGymIds: string[] = []
  let inPaidFacility = false

  if (gymIds.length > 0) {
    const { data: gymSubscriptions } = await supabase
      .from('gym_subscriptions')
      .select('gym_id, plan, status')
      .in('gym_id', gymIds)

    facilityGymIds = (gymSubscriptions ?? [])
      .filter(
        (row) =>
          row.plan === 'facility' &&
          ACTIVE_SUBSCRIPTION_STATUSES.has(row.status)
      )
      .map((row) => row.gym_id)

    inPaidFacility = facilityGymIds.length > 0
  }

  const effectivePlan = inPaidFacility
    ? maxPlan(personalPlan, 'scale')
    : personalPlan

  const clientLimit = inPaidFacility ? null : clientLimitForPlan(personalPlan)

  return {
    coachId,
    personalPlan,
    effectivePlan,
    inPaidFacility,
    ownedFacilityGymIds,
    facilityGymIds,
    billableClientCount: billableClientCount ?? 0,
    clientLimit,
  }
}

export function canAccessFeature(
  context: CoachSubscriptionContext,
  feature: SubscriptionFeature
): boolean {
  if (feature === 'gym') {
    return context.ownedFacilityGymIds.some((gymId) =>
      context.facilityGymIds.includes(gymId)
    )
  }

  const required = getMinimumPlanForFeature(feature)
  return planMeetsRequirement(context.effectivePlan, required)
}

export function canAddClient(context: CoachSubscriptionContext): boolean {
  if (context.clientLimit === null) return true
  return context.billableClientCount < context.clientLimit
}

export function getClientLimitMessage(context: CoachSubscriptionContext): string {
  if (context.clientLimit === null) {
    return 'Unlimited clients on your plan.'
  }

  if (context.personalPlan === 'starter') {
    return `Starter includes up to ${context.clientLimit} active clients. Upgrade to Growth for more.`
  }

  return `Growth includes up to ${context.clientLimit} active clients. Upgrade to Scale for unlimited.`
}

export async function countGymCoachSeats(
  supabase: DbClient,
  gymId: string
): Promise<number> {
  const [{ count: activeMembers }, { count: pendingInvites }] = await Promise.all([
    supabase
      .from('gym_members')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'active'),
    supabase
      .from('gym_invites')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'pending'),
  ])

  return (activeMembers ?? 0) + (pendingInvites ?? 0)
}

export async function getGymSubscription(
  supabase: DbClient,
  gymId: string
) {
  const { data } = await supabase
    .from('gym_subscriptions')
    .select('*')
    .eq('gym_id', gymId)
    .maybeSingle()

  return data
}

export function hasActiveFacilitySubscription(
  subscription: { status: string; plan: string } | null | undefined
): boolean {
  if (!subscription) return false
  return (
    subscription.plan === 'facility' &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)
  )
}

export function canInviteGymCoach(
  seatCount: number,
  subscription: { status: string; plan: string; included_coach_seats: number } | null | undefined
): boolean {
  if (!hasActiveFacilitySubscription(subscription)) {
    return false
  }

  const includedSeats =
    subscription?.included_coach_seats ?? FACILITY_INCLUDED_COACH_SEATS

  void includedSeats
  void seatCount
  return true
}

export function assertCanAddClient(context: CoachSubscriptionContext):
  | { ok: true }
  | { ok: false; error: string } {
  if (canAddClient(context)) {
    return { ok: true }
  }

  if (context.personalPlan === 'starter') {
    return {
      ok: false,
      error: `Starter is limited to ${STARTER_CLIENT_LIMIT} active clients. Upgrade to Growth to add more.`,
    }
  }

  return {
    ok: false,
    error: `Growth is limited to ${GROWTH_CLIENT_LIMIT} active clients. Upgrade to Scale for unlimited clients.`,
  }
}

export function assertCanCreateGym(context: CoachSubscriptionContext):
  | { ok: true }
  | { ok: false; error: string } {
  if (context.personalPlan === 'facility') {
    return { ok: true }
  }

  if (
    context.ownedFacilityGymIds.some((gymId) =>
      context.facilityGymIds.includes(gymId)
    )
  ) {
    return { ok: true }
  }

  return {
    ok: false,
    error:
      'Creating a gym requires a Facility subscription. View pricing to upgrade.',
  }
}
