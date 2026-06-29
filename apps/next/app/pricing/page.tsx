import Link from 'next/link'

import { PricingPageContent } from '@/components/pricing/pricing-page-content'
import { SwiftWordmark } from '@/components/brand/swift-wordmark'
import { Button } from '@/components/ui/button'
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
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href={user ? '/dashboard' : '/login'}>
            <SwiftWordmark className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="brand" size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

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
