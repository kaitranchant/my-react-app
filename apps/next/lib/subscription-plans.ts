export type SubscriptionPlan = 'starter' | 'growth' | 'scale' | 'facility'

export type BillingInterval = 'monthly' | 'annual'

export type SubscriptionFeature =
  | 'scheduling'
  | 'message_templates'
  | 'compliance'
  | 'form_review'
  | 'progressive_overload'
  | 'onboarding_automation'
  | 'attendance'
  | 'nutrition'
  | 'teams'
  | 'leaderboards'
  | 'broadcasts'
  | 'load_management'
  | 'gym'

export const STARTER_CLIENT_LIMIT = 5
export const GROWTH_CLIENT_LIMIT = 25

export const PLAN_RANK: Record<SubscriptionPlan, number> = {
  starter: 0,
  growth: 1,
  scale: 2,
  facility: 3,
}

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  starter: 'Starter',
  growth: 'Growth',
  scale: 'Scale',
  facility: 'Facility',
}

export const COACH_PLANS: SubscriptionPlan[] = ['starter', 'growth', 'scale']

export const FACILITY_INCLUDED_COACH_SEATS = 8
export const FACILITY_EXTRA_COACH_SEAT_PRICE_MONTHLY = 25
export const FACILITY_EXTRA_COACH_SEAT_PRICE_ANNUAL = 250

type PlanPricing = {
  monthly: number
  annual: number
  tagline: string
  description: string
  clientLimit: number | null
  highlights: string[]
}

export const PLAN_PRICING: Record<SubscriptionPlan, PlanPricing> = {
  starter: {
    monthly: 0,
    annual: 0,
    tagline: 'Try it with real clients',
    description: 'Everything you need to coach your first few athletes.',
    clientLimit: STARTER_CLIENT_LIMIT,
    highlights: [
      `Up to ${STARTER_CLIENT_LIMIT} active clients`,
      'Programs & workout builder',
      'Client portal',
      '1:1 messaging',
      'Check-ins & progress photos',
    ],
  },
  growth: {
    monthly: 39,
    annual: 390,
    tagline: 'Run your coaching business',
    description: 'Scheduling, compliance, and tools for a growing roster.',
    clientLimit: GROWTH_CLIENT_LIMIT,
    highlights: [
      `Up to ${GROWTH_CLIENT_LIMIT} active clients`,
      'Session scheduling & booking',
      'Compliance & form review',
      'Message templates & voice notes',
      'Onboarding automation',
    ],
  },
  scale: {
    monthly: 79,
    annual: 790,
    tagline: 'Full coaching OS',
    description: 'Nutrition, teams, and advanced coaching for high-volume coaches.',
    clientLimit: null,
    highlights: [
      'Unlimited clients',
      'Nutrition coaching',
      'Teams, challenges & leaderboards',
      'Broadcasts & load management',
      'Everything in Growth',
    ],
  },
  facility: {
    monthly: 199,
    annual: 1990,
    tagline: 'For facility owners',
    description: 'Scale features for your whole coaching team with shared roster tools.',
    clientLimit: null,
    highlights: [
      'Everything in Scale for all coaches',
      'Up to 8 coaches included',
      'Owner dashboard & shared roster',
      'Multi-coach compliance rollup',
      '+$25/mo per coach beyond 8',
    ],
  },
}

const FEATURE_MIN_PLAN: Record<SubscriptionFeature, SubscriptionPlan> = {
  scheduling: 'growth',
  message_templates: 'growth',
  compliance: 'growth',
  form_review: 'growth',
  progressive_overload: 'growth',
  onboarding_automation: 'growth',
  attendance: 'growth',
  nutrition: 'scale',
  teams: 'scale',
  leaderboards: 'scale',
  broadcasts: 'scale',
  load_management: 'scale',
  gym: 'facility',
}

export function getMinimumPlanForFeature(
  feature: SubscriptionFeature
): SubscriptionPlan {
  return FEATURE_MIN_PLAN[feature]
}

export function planMeetsRequirement(
  plan: SubscriptionPlan,
  required: SubscriptionPlan
): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[required]
}

export function formatPlanPrice(
  plan: SubscriptionPlan,
  interval: BillingInterval
): string {
  const amount =
    interval === 'monthly'
      ? PLAN_PRICING[plan].monthly
      : PLAN_PRICING[plan].annual

  if (amount === 0) return '$0'

  return interval === 'monthly' ? `$${amount}/mo` : `$${amount}/yr`
}

export function getUpgradePlanForFeature(
  currentPlan: SubscriptionPlan,
  feature: SubscriptionFeature
): SubscriptionPlan {
  const required = getMinimumPlanForFeature(feature)
  if (planMeetsRequirement(currentPlan, required)) {
    return currentPlan
  }
  if (required === 'facility') return 'facility'
  if (required === 'scale') return 'scale'
  if (required === 'growth') return 'growth'
  return 'starter'
}
