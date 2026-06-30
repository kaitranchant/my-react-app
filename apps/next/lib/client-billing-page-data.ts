import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ClientBillingSubscriptionWithClient,
  ClientInvoiceWithClient,
  CoachBillingOverview,
} from '@/lib/client-billing-queries'
import { findClientBillingSchemaError } from '@/lib/client-billing-schema'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'
import type { Client, Database } from 'app/types/database'

type DbClient = SupabaseClient<Database>

export type CoachBillingPageData =
  | {
      schemaError: true
    }
  | {
      schemaError: false
      connectStatus: ConnectAccountStatus
      overview: CoachBillingOverview
      invoices: ClientInvoiceWithClient[]
      subscriptions: ClientBillingSubscriptionWithClient[]
      clients: Array<Pick<Client, 'id' | 'full_name' | 'email'>>
    }

function buildOverview(
  invoices: ClientInvoiceWithClient[],
  subscriptions: ClientBillingSubscriptionWithClient[]
): CoachBillingOverview {
  const openInvoices = invoices.filter((invoice) => invoice.status === 'open')
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid')
  const activeSubscriptions = subscriptions.filter((subscription) =>
    ['active', 'trialing', 'past_due'].includes(subscription.status)
  )

  return {
    openInvoiceCount: openInvoices.length,
    openInvoiceTotalCents: openInvoices.reduce(
      (sum, invoice) => sum + invoice.amount_cents,
      0
    ),
    paidInvoiceTotalCents: paidInvoices.reduce(
      (sum, invoice) => sum + invoice.amount_cents,
      0
    ),
    activeSubscriptionCount: activeSubscriptions.length,
    monthlyRecurringCents: activeSubscriptions.reduce((sum, subscription) => {
      if (subscription.interval === 'year') {
        return sum + Math.round(subscription.amount_cents / 12)
      }
      return sum + subscription.amount_cents
    }, 0),
  }
}

export async function loadCoachBillingPageData(
  supabase: DbClient,
  coachId: string
): Promise<CoachBillingPageData> {
  const [
    connectResult,
    invoicesResult,
    subscriptionsResult,
    clientsResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted'
      )
      .eq('id', coachId)
      .maybeSingle(),
    supabase
      .from('client_invoices')
      .select(
        '*, client:clients!client_invoices_client_id_fkey(id, full_name, email)'
      )
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false }),
    supabase
      .from('client_billing_subscriptions')
      .select(
        '*, client:clients!client_billing_subscriptions_client_id_fkey(id, full_name, email)'
      )
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, full_name, email')
      .eq('coach_id', coachId)
      .eq('is_coach_self', false)
      .neq('status', 'archived')
      .order('full_name', { ascending: true }),
  ])

  const schemaError = findClientBillingSchemaError([
    connectResult.error,
    invoicesResult.error,
    subscriptionsResult.error,
  ])

  if (schemaError) {
    return { schemaError: true }
  }

  if (clientsResult.error) {
    throw clientsResult.error
  }

  const profile = connectResult.data
  const connectStatus: ConnectAccountStatus = {
    accountId: profile?.stripe_connect_account_id ?? null,
    chargesEnabled: profile?.stripe_connect_charges_enabled ?? false,
    payoutsEnabled: profile?.stripe_connect_payouts_enabled ?? false,
    detailsSubmitted: profile?.stripe_connect_details_submitted ?? false,
    isReady: Boolean(
      profile?.stripe_connect_account_id &&
        profile?.stripe_connect_charges_enabled &&
        profile?.stripe_connect_details_submitted
    ),
  }

  const invoices = (invoicesResult.data ?? []) as ClientInvoiceWithClient[]
  const subscriptions = (subscriptionsResult.data ??
    []) as ClientBillingSubscriptionWithClient[]

  return {
    schemaError: false,
    connectStatus,
    overview: buildOverview(invoices, subscriptions),
    invoices,
    subscriptions,
    clients: clientsResult.data ?? [],
  }
}

export async function loadCoachConnectStatusSafe(
  supabase: DbClient,
  coachId: string
): Promise<
  | { schemaError: true }
  | { schemaError: false; connectStatus: ConnectAccountStatus }
> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted'
    )
    .eq('id', coachId)
    .maybeSingle()

  if (error && findClientBillingSchemaError([error])) {
    return { schemaError: true }
  }

  if (error) {
    throw error
  }

  const connectStatus: ConnectAccountStatus = {
    accountId: profile?.stripe_connect_account_id ?? null,
    chargesEnabled: profile?.stripe_connect_charges_enabled ?? false,
    payoutsEnabled: profile?.stripe_connect_payouts_enabled ?? false,
    detailsSubmitted: profile?.stripe_connect_details_submitted ?? false,
    isReady: Boolean(
      profile?.stripe_connect_account_id &&
        profile?.stripe_connect_charges_enabled &&
        profile?.stripe_connect_details_submitted
    ),
  }

  return { schemaError: false, connectStatus }
}
