import type Stripe from 'stripe'

import { mapStripeInvoiceToLocal } from '@/lib/stripe/client-invoices'
import { mapStripeSubscriptionToLocal } from '@/lib/stripe/client-subscriptions'
import { refreshConnectAccountStatus } from '@/lib/stripe/connect'
import { createAdminClient } from '@/lib/supabase/admin'

export function isClientBillingMetadata(
  metadata: Stripe.Metadata | null | undefined
): boolean {
  return metadata?.billing_scope === 'client'
}

export function getLocalInvoiceIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const id = metadata?.local_invoice_id?.trim()
  return id || null
}

export function getLocalSubscriptionIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const id = metadata?.local_subscription_id?.trim()
  return id || null
}

export async function syncConnectAccountUpdated(account: Stripe.Account) {
  if (!account.id) return
  await refreshConnectAccountStatus(account.id)
}

export async function syncClientInvoiceFromStripe(
  invoice: Stripe.Invoice,
  connectAccountId?: string | null
) {
  if (!isClientBillingMetadata(invoice.metadata)) {
    return
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const localInvoiceId = getLocalInvoiceIdFromMetadata(invoice.metadata)
  const mapped = mapStripeInvoiceToLocal(invoice)

  if (localInvoiceId) {
    const { error } = await admin
      .from('client_invoices')
      .update({
        status: mapped.status,
        hosted_invoice_url: mapped.hosted_invoice_url,
        paid_at: mapped.paid_at,
        stripe_invoice_id: invoice.id,
        ...(mapped.amount_cents ? { amount_cents: mapped.amount_cents } : {}),
      })
      .eq('id', localInvoiceId)

    if (error) {
      throw error
    }
    return
  }

  if (!invoice.id) return

  const { error } = await admin
    .from('client_invoices')
    .update({
      status: mapped.status,
      hosted_invoice_url: mapped.hosted_invoice_url,
      paid_at: mapped.paid_at,
      ...(mapped.amount_cents ? { amount_cents: mapped.amount_cents } : {}),
    })
    .eq('stripe_invoice_id', invoice.id)

  if (error) {
    throw error
  }

  if (connectAccountId && invoice.metadata?.coach_id) {
    // no-op: connectAccountId reserved for future cross-checks
  }
}

export async function syncClientSubscriptionFromStripe(
  subscription: Stripe.Subscription
) {
  if (!isClientBillingMetadata(subscription.metadata)) {
    return
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const localSubscriptionId = getLocalSubscriptionIdFromMetadata(
    subscription.metadata
  )
  const mapped = mapStripeSubscriptionToLocal(subscription)

  if (localSubscriptionId) {
    const { error } = await admin
      .from('client_billing_subscriptions')
      .update({
        status: mapped.status,
        stripe_subscription_id: mapped.stripe_subscription_id,
        current_period_end: mapped.current_period_end,
        canceled_at: mapped.canceled_at,
        checkout_url: null,
      })
      .eq('id', localSubscriptionId)

    if (error) {
      throw error
    }
    return
  }

  if (!subscription.id) return

  const { error } = await admin
    .from('client_billing_subscriptions')
    .update({
      status: mapped.status,
      current_period_end: mapped.current_period_end,
      canceled_at: mapped.canceled_at,
      checkout_url: null,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    throw error
  }
}

export async function linkClientSubscriptionFromCheckout(
  session: Stripe.Checkout.Session
) {
  if (session.metadata?.billing_scope !== 'client') {
    return
  }

  const localSubscriptionId = getLocalSubscriptionIdFromMetadata(session.metadata)
  if (!localSubscriptionId) {
    return
  }

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id

  if (!subscriptionId) {
    return
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { error } = await admin
    .from('client_billing_subscriptions')
    .update({
      stripe_subscription_id: subscriptionId,
      checkout_session_id: session.id,
      checkout_url: null,
    })
    .eq('id', localSubscriptionId)

  if (error) {
    throw error
  }
}
