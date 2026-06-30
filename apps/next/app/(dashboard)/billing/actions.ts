'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClientStripeInvoice, voidClientStripeInvoice } from '@/lib/stripe/client-invoices'
import {
  cancelClientStripeSubscription,
  createClientStripeSubscription,
} from '@/lib/stripe/client-subscriptions'
import {
  clearConnectAccount,
  createConnectDashboardLink,
  createConnectOnboardingUrl,
  getCoachConnectStatus,
  isConnectReady,
  refreshConnectAccountStatus,
} from '@/lib/stripe/connect'
import { isStripeConfigured, getStripeKeyMode } from '@/lib/stripe/config'
import {
  formatConnectOnboardingError,
  isStripePlatformProfileError,
} from '@/lib/stripe/connect-errors'
import {
  canAccessFeature,
  getCoachSubscriptionContext,
} from '@/lib/subscription-entitlements'
import { createClient } from '@/lib/supabase/server'

const createInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  description: z.string().trim().min(1).max(500),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const createSubscriptionSchema = z.object({
  clientId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  interval: z.enum(['month', 'year']),
  description: z.string().trim().min(1).max(500),
})

type ActionResult =
  | { success: true }
  | { success: false; error: string }

type UrlActionResult =
  | { success: true; url: string }
  | { success: false; error: string; platformProfileRequired?: boolean }

async function requireClientBillingCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be signed in.')
  }

  const context = await getCoachSubscriptionContext(supabase, user.id)
  if (!canAccessFeature(context, 'client_billing')) {
    throw new Error('Upgrade to Growth to bill clients through the app.')
  }

  const connectStatus = await getCoachConnectStatus(supabase, user.id)
  if (!isConnectReady(connectStatus)) {
    throw new Error('Connect and finish setting up Stripe before billing clients.')
  }

  return { supabase, user, connectStatus }
}

async function getOwnedClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  coachId: string,
  clientId: string
) {
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, email, coach_id')
    .eq('id', clientId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (!client) {
    throw new Error('Client not found.')
  }

  if (!client.email?.trim()) {
    throw new Error('Add an email address to this client before billing them.')
  }

  return client
}

export async function startConnectOnboarding(): Promise<UrlActionResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const context = await getCoachSubscriptionContext(supabase, user.id)
  if (!canAccessFeature(context, 'client_billing')) {
    return {
      success: false,
      error: 'Upgrade to Growth to bill clients through the app.',
    }
  }

  try {
    const url = await createConnectOnboardingUrl(user.id)
    return { success: true, url }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not start onboarding.'
    return {
      success: false,
      error: formatConnectOnboardingError(message, getStripeKeyMode()),
      platformProfileRequired: isStripePlatformProfileError(message),
    }
  }
}

export async function resetConnectAccountAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  try {
    await clearConnectAccount(user.id)
    revalidatePath('/settings')
    revalidatePath('/billing')
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not reset Connect account.'
    return { success: false, error: message }
  }
}

export async function syncConnectAccountAction(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const connectStatus = await getCoachConnectStatus(supabase, user.id)
  if (!connectStatus.accountId) {
    return { success: false, error: 'No Connect account to sync.' }
  }

  try {
    await refreshConnectAccountStatus(connectStatus.accountId)
    revalidatePath('/settings')
    revalidatePath('/billing')
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not sync Connect account.'
    return { success: false, error: message }
  }
}

export async function openConnectDashboard(): Promise<UrlActionResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  try {
    const url = await createConnectDashboardLink(user.id)
    return { success: true, url }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not open dashboard.'
    return {
      success: false,
      error: formatConnectOnboardingError(message, getStripeKeyMode()),
    }
  }
}

export async function createClientInvoiceAction(input: {
  clientId: string
  amountCents: number
  description: string
  dueDate?: string
}): Promise<ActionResult & { invoiceId?: string }> {
  const parsed = createInvoiceSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid invoice request.' }
  }

  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured.' }
  }

  try {
    const { supabase, user, connectStatus } = await requireClientBillingCoach()
    const client = await getOwnedClient(supabase, user.id, parsed.data.clientId)

    const result = await createClientStripeInvoice({
      supabase,
      coachId: user.id,
      connectAccountId: connectStatus.accountId!,
      clientId: client.id,
      clientEmail: client.email!,
      clientName: client.full_name,
      amountCents: parsed.data.amountCents,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ?? null,
    })

    if (!result.success) {
      return result
    }

    revalidatePath('/billing')
    revalidatePath('/portal/billing')
    return { success: true, invoiceId: result.invoiceId }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not create invoice.'
    return { success: false, error: message }
  }
}

export async function voidClientInvoiceAction(
  invoiceId: string
): Promise<ActionResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured.' }
  }

  try {
    const { supabase, user, connectStatus } = await requireClientBillingCoach()

    const { data: invoice } = await supabase
      .from('client_invoices')
      .select('id, status, stripe_invoice_id')
      .eq('id', invoiceId)
      .eq('coach_id', user.id)
      .maybeSingle()

    if (!invoice) {
      return { success: false, error: 'Invoice not found.' }
    }

    if (invoice.status !== 'open' && invoice.status !== 'draft') {
      return { success: false, error: 'Only open invoices can be voided.' }
    }

    if (!invoice.stripe_invoice_id) {
      return { success: false, error: 'Stripe invoice is missing.' }
    }

    const result = await voidClientStripeInvoice({
      connectAccountId: connectStatus.accountId!,
      stripeInvoiceId: invoice.stripe_invoice_id,
      localInvoiceId: invoice.id,
    })

    if (!result.success) {
      return result
    }

    revalidatePath('/billing')
    revalidatePath('/portal/billing')
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not void invoice.'
    return { success: false, error: message }
  }
}

export async function createClientSubscriptionAction(input: {
  clientId: string
  amountCents: number
  interval: 'month' | 'year'
  description: string
}): Promise<UrlActionResult & { subscriptionId?: string }> {
  const parsed = createSubscriptionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid subscription request.' }
  }

  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured.' }
  }

  try {
    const { supabase, user, connectStatus } = await requireClientBillingCoach()
    const client = await getOwnedClient(supabase, user.id, parsed.data.clientId)

    const result = await createClientStripeSubscription({
      supabase,
      coachId: user.id,
      connectAccountId: connectStatus.accountId!,
      clientId: client.id,
      clientEmail: client.email!,
      clientName: client.full_name,
      amountCents: parsed.data.amountCents,
      interval: parsed.data.interval,
      description: parsed.data.description,
    })

    if (!result.success) {
      return result
    }

    revalidatePath('/billing')
    revalidatePath('/portal/billing')
    return {
      success: true,
      url: result.checkoutUrl,
      subscriptionId: result.subscriptionId,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not create subscription.'
    return { success: false, error: message }
  }
}

export async function cancelClientSubscriptionAction(
  subscriptionId: string
): Promise<ActionResult> {
  if (!isStripeConfigured()) {
    return { success: false, error: 'Stripe is not configured.' }
  }

  try {
    const { supabase, user, connectStatus } = await requireClientBillingCoach()

    const { data: subscription } = await supabase
      .from('client_billing_subscriptions')
      .select('id, status, stripe_subscription_id')
      .eq('id', subscriptionId)
      .eq('coach_id', user.id)
      .maybeSingle()

    if (!subscription) {
      return { success: false, error: 'Subscription not found.' }
    }

    if (!subscription.stripe_subscription_id) {
      return {
        success: false,
        error: 'This subscription has not been activated yet.',
      }
    }

    if (subscription.status === 'canceled') {
      return { success: false, error: 'Subscription is already canceled.' }
    }

    const result = await cancelClientStripeSubscription({
      connectAccountId: connectStatus.accountId!,
      stripeSubscriptionId: subscription.stripe_subscription_id,
      localSubscriptionId: subscription.id,
    })

    if (!result.success) {
      return result
    }

    revalidatePath('/billing')
    revalidatePath('/portal/billing')
    return { success: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not cancel subscription.'
    return { success: false, error: message }
  }
}
