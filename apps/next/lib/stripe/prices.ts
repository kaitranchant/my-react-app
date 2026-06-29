import type { BillingInterval, SubscriptionPlan } from '@/lib/subscription-plans'

const PAID_PLANS = ['growth', 'scale', 'facility'] as const
export type PaidSubscriptionPlan = (typeof PAID_PLANS)[number]

export function isPaidPlan(plan: SubscriptionPlan): plan is PaidSubscriptionPlan {
  return PAID_PLANS.includes(plan as PaidSubscriptionPlan)
}

function envPriceKey(plan: PaidSubscriptionPlan, interval: BillingInterval): string {
  const planKey = plan.toUpperCase()
  const intervalKey = interval === 'monthly' ? 'MONTHLY' : 'ANNUAL'
  return `STRIPE_PRICE_${planKey}_${intervalKey}`
}

export function getStripePriceId(
  plan: PaidSubscriptionPlan,
  interval: BillingInterval
): string | null {
  const value = process.env[envPriceKey(plan, interval)]?.trim()
  return value || null
}

export function getPlanFromStripePriceId(
  priceId: string
): { plan: PaidSubscriptionPlan; interval: BillingInterval } | null {
  for (const plan of PAID_PLANS) {
    for (const interval of ['monthly', 'annual'] as const) {
      if (getStripePriceId(plan, interval) === priceId) {
        return { plan, interval }
      }
    }
  }
  return null
}

export function listConfiguredStripePrices(): string[] {
  const ids: string[] = []
  for (const plan of PAID_PLANS) {
    for (const interval of ['monthly', 'annual'] as const) {
      const id = getStripePriceId(plan, interval)
      if (id) ids.push(id)
    }
  }
  return ids
}
