import { PortalBillingPanel } from '@/components/portal/portal-billing-panel'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { PageHeader } from '@/components/dashboard/page-header'
import { fetchPortalClientBilling } from '@/lib/client-billing-queries'
import {
  CLIENT_BILLING_SCHEMA_TABLES,
  CLIENT_BILLING_SQL_FILE,
  findClientBillingSchemaError,
} from '@/lib/client-billing-schema'
import { getPortalClientContext } from '@/lib/portal-client'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Billing — Client Portal',
}

export default async function PortalBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  const portalCtx = await getPortalClientContext()
  if (!portalCtx) {
    redirect('/login')
  }

  const { payment } = await searchParams

  let billing
  try {
    billing = await fetchPortalClientBilling(
      portalCtx.supabase,
      portalCtx.client.id
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (findClientBillingSchemaError([{ message }])) {
      return (
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <PageHeader
            title="Billing"
            description="View invoices, subscriptions, and payment history."
          />
          <SchemaSetupNotice
            tables={CLIENT_BILLING_SCHEMA_TABLES}
            sqlFile={CLIENT_BILLING_SQL_FILE}
          />
        </div>
      )
    }
    throw error
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Billing"
        description="View invoices, subscriptions, and payment history."
      />

      <PortalBillingPanel
        invoices={billing.invoices}
        subscriptions={billing.subscriptions}
        paymentSuccess={payment === 'success'}
        paymentCanceled={payment === 'canceled'}
      />
    </div>
  )
}
