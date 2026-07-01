import { MarketingSiteHeader } from '@/components/legal/marketing-site-header'
import { PricingPageContent } from '@/components/pricing/pricing-page-content'
import { createClient } from '@/lib/supabase/server'
import { isStripeConfigured } from '@/lib/stripe/config'
import type { SubscriptionPlan } from '@/lib/subscription-plans'

export const metadata = {
  title: 'Pricing — Coaching App',
}

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentPlan: SubscriptionPlan | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'coach') {
      currentPlan = (profile.subscription_plan ?? 'starter') as SubscriptionPlan
    }
  }

  return (
    <div className="min-h-screen">
      <MarketingSiteHeader isSignedIn={Boolean(user)} />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <PricingPageContent
          currentPlan={currentPlan}
          isSignedIn={Boolean(user)}
          stripeEnabled={isStripeConfigured()}
        />
      </main>
    </div>
  )
}
