'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { StripeCheckoutButton } from '@/components/billing/stripe-checkout-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  COACH_PLANS,
  FACILITY_INCLUDED_COACH_SEATS,
  formatPlanPrice,
  PLAN_LABELS,
  PLAN_PRICING,
  type BillingInterval,
  type SubscriptionPlan,
} from '@/lib/subscription-plans'

type PricingPageContentProps = {
  currentPlan?: SubscriptionPlan | null
  isSignedIn?: boolean
  stripeEnabled?: boolean
}

function PricingToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval
  onChange: (interval: BillingInterval) => void
}) {
  return (
    <div className="bg-muted inline-flex rounded-lg p-1">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={cn(
          'rounded-md px-4 py-2 text-sm font-medium transition-colors',
          interval === 'monthly'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={cn(
          'rounded-md px-4 py-2 text-sm font-medium transition-colors',
          interval === 'annual'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Annual
      </button>
    </div>
  )
}

function PlanCard({
  plan,
  interval,
  currentPlan,
  isSignedIn,
  stripeEnabled = false,
  highlighted = false,
}: {
  plan: SubscriptionPlan
  interval: BillingInterval
  currentPlan?: SubscriptionPlan | null
  isSignedIn?: boolean
  stripeEnabled?: boolean
  highlighted?: boolean
}) {
  const pricing = PLAN_PRICING[plan]
  const isCurrent = currentPlan === plan
  const isPaidCoachPlan = plan === 'growth' || plan === 'scale'

  let ctaLabel = 'Get started'
  if (plan === 'growth') ctaLabel = 'Start Growth'
  if (plan === 'scale') ctaLabel = 'Go Scale'
  if (isCurrent) ctaLabel = 'Current plan'

  const showStripeCheckout =
    stripeEnabled && isSignedIn && isPaidCoachPlan && !isCurrent

  return (
    <Card
      className={cn(
        'flex flex-col',
        highlighted && 'border-primary shadow-md'
      )}
    >
      <CardHeader>
        <CardTitle>{PLAN_LABELS[plan]}</CardTitle>
        <CardDescription>{pricing.tagline}</CardDescription>
        <div className="pt-2">
          <p className="text-3xl font-semibold tracking-tight">
            {formatPlanPrice(plan, interval)}
          </p>
          {interval === 'annual' && pricing.monthly > 0 ? (
            <p className="text-muted-foreground text-xs">
              ~2 months free vs monthly
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-muted-foreground mb-4 text-sm">{pricing.description}</p>
        <ul className="space-y-2">
          {pricing.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Check className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {showStripeCheckout ? (
          <StripeCheckoutButton
            plan={plan}
            interval={interval}
            variant={highlighted ? 'brand' : 'outline'}
            className="w-full"
          >
            {ctaLabel}
          </StripeCheckoutButton>
        ) : (
          <Button
            asChild
            variant={highlighted ? 'brand' : 'outline'}
            className="w-full"
            disabled={isCurrent}
          >
            <Link
              href={
                isCurrent
                  ? '/settings#billing'
                  : isSignedIn
                    ? '/settings#billing'
                    : '/signup'
              }
            >
              {ctaLabel}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

export function PricingPageContent({
  currentPlan,
  isSignedIn = false,
  stripeEnabled = false,
}: PricingPageContentProps) {
  const [interval, setInterval] = React.useState<BillingInterval>('monthly')

  return (
    <div className="space-y-16">
      <section className="space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing for coaches
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base">
            Start free with up to 5 clients. Upgrade as your roster grows.
            Clients always use the portal at no extra cost.
          </p>
        </div>
        <PricingToggle interval={interval} onChange={setInterval} />
        <div className="grid gap-6 lg:grid-cols-3">
          {COACH_PLANS.map((plan) => (
            <PlanCard
              key={plan}
              plan={plan}
              interval={interval}
              currentPlan={currentPlan}
              isSignedIn={isSignedIn}
              stripeEnabled={stripeEnabled}
              highlighted={plan === 'growth'}
            />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            For facilities
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm">
            One subscription for your whole coaching team with shared roster
            tools and an owner dashboard.
          </p>
        </div>
        <Card className="mx-auto max-w-3xl border-primary/30">
          <CardHeader>
            <CardTitle>{PLAN_LABELS.facility}</CardTitle>
            <CardDescription>{PLAN_PRICING.facility.tagline}</CardDescription>
            <p className="pt-2 text-3xl font-semibold tracking-tight">
              {formatPlanPrice('facility', interval)}
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <ul className="space-y-2">
              {PLAN_PRICING.facility.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium">Includes {FACILITY_INCLUDED_COACH_SEATS} coaches</p>
              <p className="text-muted-foreground mt-1">
                Additional coaches are +$
                {interval === 'monthly' ? '25/mo' : '250/yr'} each beyond the
                included seats.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            {stripeEnabled && isSignedIn && currentPlan !== 'facility' ? (
              <StripeCheckoutButton
                plan="facility"
                interval={interval}
                variant="brand"
                className="w-full sm:w-auto"
              >
                Start Facility
              </StripeCheckoutButton>
            ) : (
              <Button asChild variant="brand" className="w-full sm:w-auto">
                <Link href={isSignedIn ? '/settings#billing' : '/signup'}>
                  {currentPlan === 'facility' ? 'Current plan' : 'Start Facility'}
                </Link>
              </Button>
            )}
          </CardFooter>
        </Card>
      </section>

      <section className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-3 pr-4 font-medium">Feature</th>
              {COACH_PLANS.map((plan) => (
                <th key={plan} className="px-4 py-3 font-medium">
                  {PLAN_LABELS[plan]}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Facility</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {[
              ['Active clients', '5', '25', 'Unlimited', 'Unlimited'],
              ['Programs & portal', 'Yes', 'Yes', 'Yes', 'Yes'],
              ['Scheduling', '—', 'Yes', 'Yes', 'Yes'],
              ['Compliance & form review', '—', 'Yes', 'Yes', 'Yes'],
              ['Nutrition', '—', '—', 'Yes', 'Yes'],
              ['Teams & leaderboards', '—', '—', 'Yes', 'Yes'],
              ['Gym & shared roster', '—', '—', '—', 'Yes'],
            ].map(([feature, ...values]) => (
              <tr key={feature} className="border-b">
                <td className="text-foreground py-3 pr-4">{feature}</td>
                {values.map((value, index) => (
                  <td key={`${feature}-${index}`} className="px-4 py-3">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
