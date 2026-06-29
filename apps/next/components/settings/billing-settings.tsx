'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  StripeCheckoutButton,
  StripePortalButton,
} from '@/components/billing/stripe-checkout-button'
import {
  getClientLimitMessage,
  type CoachSubscriptionContext,
} from '@/lib/subscription-entitlements'
import { PLAN_LABELS, PLAN_PRICING } from '@/lib/subscription-plans'

type BillingSettingsProps = {
  context: CoachSubscriptionContext
  stripeEnabled: boolean
  hasStripeCustomer: boolean
  checkoutSuccess?: boolean
}

export function BillingSettings({
  context,
  stripeEnabled,
  hasStripeCustomer,
  checkoutSuccess = false,
}: BillingSettingsProps) {
  const planLabel = PLAN_LABELS[context.personalPlan]
  const pricing = PLAN_PRICING[context.personalPlan]
  const clientUsage =
    context.clientLimit === null
      ? `${context.billableClientCount} active clients`
      : `${context.billableClientCount} / ${context.clientLimit} active clients`

  return (
    <div className="space-y-4">
      {checkoutSuccess ? (
        <div className="border-status-success/30 bg-status-success/10 text-status-success-foreground rounded-lg border px-4 py-3 text-sm">
          Subscription updated. Your plan may take a moment to reflect everywhere.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current plan</CardTitle>
          <CardDescription>
            Manage your subscription and see what&apos;s included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold tracking-tight">{planLabel}</p>
              <p className="text-muted-foreground text-sm">{pricing.tagline}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">
                {pricing.monthly === 0 ? 'Free' : `$${pricing.monthly}/mo`}
              </p>
              {pricing.annual > 0 ? (
                <p className="text-muted-foreground text-xs">
                  or ${pricing.annual}/yr
                </p>
              ) : null}
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm">
            <p className="font-medium">Client usage</p>
            <p className="text-muted-foreground mt-1">{clientUsage}</p>
            <p className="text-muted-foreground mt-2 text-xs">
              {getClientLimitMessage(context)}
            </p>
          </div>

          {context.inPaidFacility ? (
            <p className="text-muted-foreground text-sm">
              You&apos;re on a Facility team — Scale-level features are included
              through your gym membership.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/pricing">View pricing</Link>
            </Button>

            {stripeEnabled && context.personalPlan === 'starter' ? (
              <StripeCheckoutButton plan="growth" variant="brand" className="h-8 px-3 text-xs">
                Upgrade to Growth
              </StripeCheckoutButton>
            ) : null}

            {stripeEnabled && context.personalPlan === 'growth' ? (
              <StripeCheckoutButton plan="scale" variant="brand" className="h-8 px-3 text-xs">
                Upgrade to Scale
              </StripeCheckoutButton>
            ) : null}

            {stripeEnabled && hasStripeCustomer ? (
              <StripePortalButton className="h-8 px-3 text-xs">
                Manage billing
              </StripePortalButton>
            ) : null}
          </div>

          {!stripeEnabled ? (
            <p className="text-muted-foreground text-xs">
              Stripe is not configured in this environment. Set Stripe env vars to
              enable checkout.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
