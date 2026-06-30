import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Client,
  ClientBillingSubscription,
  ClientInvoice,
  Database,
} from 'app/types/database'

type DbClient = SupabaseClient<Database>

export type ClientInvoiceWithClient = ClientInvoice & {
  client: Pick<Client, 'id' | 'full_name' | 'email'>
}

export type ClientBillingSubscriptionWithClient = ClientBillingSubscription & {
  client: Pick<Client, 'id' | 'full_name' | 'email'>
}

export type CoachBillingOverview = {
  openInvoiceCount: number
  openInvoiceTotalCents: number
  paidInvoiceTotalCents: number
  activeSubscriptionCount: number
  monthlyRecurringCents: number
}

export async function fetchCoachClientInvoices(
  supabase: DbClient,
  coachId: string
): Promise<ClientInvoiceWithClient[]> {
  const { data, error } = await supabase
    .from('client_invoices')
    .select(
      '*, client:clients!client_invoices_client_id_fkey(id, full_name, email)'
    )
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as ClientInvoiceWithClient[]
}

export async function fetchCoachClientSubscriptions(
  supabase: DbClient,
  coachId: string
): Promise<ClientBillingSubscriptionWithClient[]> {
  const { data, error } = await supabase
    .from('client_billing_subscriptions')
    .select(
      '*, client:clients!client_billing_subscriptions_client_id_fkey(id, full_name, email)'
    )
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as ClientBillingSubscriptionWithClient[]
}

export async function fetchCoachBillingOverview(
  supabase: DbClient,
  coachId: string
): Promise<CoachBillingOverview> {
  const [invoices, subscriptions] = await Promise.all([
    fetchCoachClientInvoices(supabase, coachId),
    fetchCoachClientSubscriptions(supabase, coachId),
  ])

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

export async function fetchPortalClientBilling(
  supabase: DbClient,
  clientId: string
): Promise<{
  invoices: ClientInvoice[]
  subscriptions: ClientBillingSubscription[]
  openInvoiceCount: number
}> {
  const [{ data: invoices, error: invoiceError }, { data: subscriptions, error: subscriptionError }] =
    await Promise.all([
      supabase
        .from('client_invoices')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_billing_subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ])

  if (invoiceError) {
    throw invoiceError
  }
  if (subscriptionError) {
    throw subscriptionError
  }

  const invoiceRows = invoices ?? []
  const openInvoiceCount = invoiceRows.filter(
    (invoice) => invoice.status === 'open'
  ).length

  return {
    invoices: invoiceRows,
    subscriptions: subscriptions ?? [],
    openInvoiceCount,
  }
}

export async function fetchCoachBillingClients(
  supabase: DbClient,
  coachId: string
): Promise<Array<Pick<Client, 'id' | 'full_name' | 'email'>>> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, full_name, email')
    .eq('coach_id', coachId)
    .eq('is_coach_self', false)
    .neq('status', 'archived')
    .order('full_name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}
