import { CoachBillingPanel } from '@/components/billing/coach-billing-panel'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { PageHeader } from '@/components/dashboard/page-header'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import {
  CLIENT_BILLING_SCHEMA_TABLES,
  CLIENT_BILLING_SQL_FILE,
} from '@/lib/client-billing-schema'
import { loadCoachBillingPageData } from '@/lib/client-billing-page-data'
import { isStripeConfigured, getStripeKeyMode, getLiveModeHttpsRedirectError } from '@/lib/stripe/config'
import { getAppBaseUrl } from '@/lib/email/config'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionGate } from '@/lib/subscription-server'

export const metadata = {
  title: 'Client Billing — Coaching App',
}

export default async function BillingPage() {
  const gate = await getSubscriptionGate('client_billing')
  if (!gate.allowed) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Client billing"
          description="Send invoices and collect recurring payments from your clients."
        />
        <UpgradePrompt gate={gate} />
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const billingData = await loadCoachBillingPageData(supabase, user!.id)

  if (billingData.schemaError) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Client billing"
          description="Send invoices and collect recurring payments from your clients."
        />
        <SchemaSetupNotice
          tables={CLIENT_BILLING_SCHEMA_TABLES}
          sqlFile={CLIENT_BILLING_SQL_FILE}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Client billing"
        description="Send invoices and collect recurring payments from your clients."
      />

      <CoachBillingPanel
        connectStatus={billingData.connectStatus}
        overview={billingData.overview}
        invoices={billingData.invoices}
        subscriptions={billingData.subscriptions}
        clients={billingData.clients}
        stripeEnabled={isStripeConfigured()}
        stripeKeyMode={getStripeKeyMode()}
        liveModeHttpsBlocked={Boolean(
          getLiveModeHttpsRedirectError(getAppBaseUrl())
        )}
        appBaseUrl={getAppBaseUrl()}
      />
    </div>
  )
}
