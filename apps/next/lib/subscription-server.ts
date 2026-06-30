import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import {
  canAccessFeature,
  getCoachSubscriptionContext,
  type CoachSubscriptionContext,
} from '@/lib/subscription-entitlements'
import {
  getMinimumPlanForFeature,
  getUpgradePlanForFeature,
  PLAN_LABELS,
  type SubscriptionFeature,
  type SubscriptionPlan,
} from '@/lib/subscription-plans'

export type SubscriptionGateResult =
  | {
      allowed: true
      context: CoachSubscriptionContext
    }
  | {
      allowed: false
      context: CoachSubscriptionContext
      feature: SubscriptionFeature
      requiredPlan: SubscriptionPlan
    }

export async function requireCoachUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return { supabase, user }
}

export async function getSubscriptionGate(
  feature: SubscriptionFeature
): Promise<SubscriptionGateResult> {
  const { supabase, user } = await requireCoachUser()
  const context = await getCoachSubscriptionContext(supabase, user.id)

  if (canAccessFeature(context, feature)) {
    return { allowed: true, context }
  }

  return {
    allowed: false,
    context,
    feature,
    requiredPlan: getUpgradePlanForFeature(context.effectivePlan, feature),
  }
}

export function getFeatureLabel(feature: SubscriptionFeature): string {
  const labels: Record<SubscriptionFeature, string> = {
    scheduling: 'Scheduling & booking',
    message_templates: 'Message templates',
    compliance: 'Compliance dashboard',
    form_review: 'Form review',
    progressive_overload: 'Progressive overload',
    onboarding_automation: 'Onboarding automation',
    attendance: 'Attendance',
    nutrition: 'Nutrition coaching',
    teams: 'Teams',
    leaderboards: 'Leaderboards',
    broadcasts: 'Broadcasts',
    load_management: 'Load management',
    gym: 'Facility management',
    client_billing: 'Client billing',
  }

  return labels[feature]
}

export function getUpgradeMessage(
  feature: SubscriptionFeature,
  requiredPlan: SubscriptionPlan
): string {
  const featureLabel = getFeatureLabel(feature)
  const planLabel = PLAN_LABELS[requiredPlan]
  const minPlan = getMinimumPlanForFeature(feature)

  if (minPlan === 'facility') {
    return `${featureLabel} is available on the Facility plan. Upgrade to give your whole team access.`
  }

  return `${featureLabel} is available on ${planLabel} and above. Upgrade your plan to unlock it.`
}
