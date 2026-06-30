import type Stripe from 'stripe'

import { getOrCreateConnectClientCustomer } from '@/lib/stripe/connect-client-customer'
import { getStripeClient } from '@/lib/stripe/config'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientInvoiceStatus, Database } from 'app/types/database'

type DbClient = SupabaseClient<Database>

export type CreateClientInvoiceInput = {
  supabase: DbClient
  coachId: string
  connectAccountId: string
  clientId: string
  clientEmail: string
  clientName: string
  amountCents: number
  description: string
  dueDate?: string | null
  currency?: string
}

export type CreateClientInvoiceResult =
  | { success: true; invoiceId: string }
  | { success: false; error: string }

function mapStripeInvoiceStatus(status: Stripe.Invoice.Status): ClientInvoiceStatus {
  switch (status) {
    case 'draft':
      return 'draft'
    case 'open':
      return 'open'
    case 'paid':
      return 'paid'
    case 'void':
      return 'void'
    case 'uncollectible':
      return 'uncollectible'
    default:
      return 'open'
  }
}

export async function createClientStripeInvoice(
  input: CreateClientInvoiceInput
): Promise<CreateClientInvoiceResult> {
  const admin = createAdminClient()
  if (!admin) {
    return { success: false, error: 'Billing service is unavailable.' }
  }

  if (input.amountCents <= 0) {
    return { success: false, error: 'Amount must be greater than zero.' }
  }

  const description = input.description.trim()
  if (!description) {
    return { success: false, error: 'Description is required.' }
  }

  try {
    const customerId = await getOrCreateConnectClientCustomer({
      supabase: input.supabase,
      connectAccountId: input.connectAccountId,
      clientId: input.clientId,
      email: input.clientEmail,
      name: input.clientName,
    })

    const { data: localInvoice, error: insertError } = await admin
      .from('client_invoices')
      .insert({
        coach_id: input.coachId,
        client_id: input.clientId,
        amount_cents: input.amountCents,
        currency: input.currency ?? 'usd',
        description,
        status: 'draft',
        due_date: input.dueDate ?? null,
      })
      .select('id')
      .single()

    if (insertError || !localInvoice) {
      return {
        success: false,
        error: insertError?.message ?? 'Could not create invoice record.',
      }
    }

    const stripe = getStripeClient()
    const metadata = {
      billing_scope: 'client',
      coach_id: input.coachId,
      client_id: input.clientId,
      local_invoice_id: localInvoice.id,
    }

    await stripe.invoiceItems.create(
      {
        customer: customerId,
        amount: input.amountCents,
        currency: input.currency ?? 'usd',
        description,
        metadata,
      },
      { stripeAccount: input.connectAccountId }
    )

    const stripeInvoice = await stripe.invoices.create(
      {
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: input.dueDate ? undefined : 7,
        due_date: input.dueDate
          ? Math.floor(new Date(`${input.dueDate}T12:00:00Z`).getTime() / 1000)
          : undefined,
        metadata,
      },
      { stripeAccount: input.connectAccountId }
    )

    const finalized = await stripe.invoices.finalizeInvoice(
      stripeInvoice.id,
      { auto_advance: true },
      { stripeAccount: input.connectAccountId }
    )

    const sent = await stripe.invoices.sendInvoice(
      finalized.id,
      {},
      { stripeAccount: input.connectAccountId }
    )

    const { error: updateError } = await admin
      .from('client_invoices')
      .update({
        status: mapStripeInvoiceStatus(sent.status ?? 'open'),
        stripe_invoice_id: sent.id,
        hosted_invoice_url: sent.hosted_invoice_url,
      })
      .eq('id', localInvoice.id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true, invoiceId: localInvoice.id }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not create invoice.'
    return { success: false, error: message }
  }
}

export async function voidClientStripeInvoice(params: {
  connectAccountId: string
  stripeInvoiceId: string
  localInvoiceId: string
}): Promise<{ success: true } | { success: false; error: string }> {
  const admin = createAdminClient()
  if (!admin) {
    return { success: false, error: 'Billing service is unavailable.' }
  }

  try {
    const stripe = getStripeClient()
    await stripe.invoices.voidInvoice(
      params.stripeInvoiceId,
      {},
      { stripeAccount: params.connectAccountId }
    )

    const { error } = await admin
      .from('client_invoices')
      .update({ status: 'void' })
      .eq('id', params.localInvoiceId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not void invoice.'
    return { success: false, error: message }
  }
}

export function mapStripeInvoiceToLocal(
  invoice: Stripe.Invoice
): Partial<{
  status: ClientInvoiceStatus
  hosted_invoice_url: string | null
  paid_at: string | null
  amount_cents: number
}> {
  const paidAt =
    invoice.status === 'paid' && invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null

  return {
    status: mapStripeInvoiceStatus(invoice.status ?? 'open'),
    hosted_invoice_url: invoice.hosted_invoice_url ?? null,
    paid_at: paidAt,
    amount_cents: invoice.amount_due ?? invoice.total ?? undefined,
  }
}
