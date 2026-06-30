import { getAppBaseUrl } from '@/lib/email/config'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  assertStripeLiveModeRedirects,
  getLiveModeHttpsRedirectError,
  getStripeClient,
  getStripeKeyMode,
  isStripeConfigured,
} from '@/lib/stripe/config'
import { isLiveModeHttpsBlocked, LIVE_HTTPS_REQUIRED_MESSAGE } from '@/lib/stripe/connect-errors'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from 'app/types/database'

type DbClient = SupabaseClient<Database>

export type ConnectAccountStatus = {
  accountId: string | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  isReady: boolean
}

export function isConnectReady(status: ConnectAccountStatus): boolean {
  return Boolean(status.accountId && status.chargesEnabled && status.detailsSubmitted)
}

export async function getCoachConnectStatus(
  supabase: DbClient,
  coachId: string
): Promise<ConnectAccountStatus> {
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted'
    )
    .eq('id', coachId)
    .maybeSingle()

  const accountId = profile?.stripe_connect_account_id ?? null
  const chargesEnabled = profile?.stripe_connect_charges_enabled ?? false
  const payoutsEnabled = profile?.stripe_connect_payouts_enabled ?? false
  const detailsSubmitted = profile?.stripe_connect_details_submitted ?? false

  return {
    accountId,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    isReady: Boolean(accountId && chargesEnabled && detailsSubmitted),
  }
}

export async function getOrCreateConnectAccount(coachId: string): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured.')
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Billing service is unavailable.')
  }

  const { data: profile } = await admin
    .from('profiles')
    .select(
      'stripe_connect_account_id, full_name, business_name, role'
    )
    .eq('id', coachId)
    .single()

  if (profile?.role !== 'coach') {
    throw new Error('Only coach accounts can connect Stripe.')
  }

  const stripe = getStripeClient()

  if (profile?.stripe_connect_account_id) {
    try {
      await stripe.accounts.retrieve(profile.stripe_connect_account_id)
      return profile.stripe_connect_account_id
    } catch {
      await admin
        .from('profiles')
        .update({
          stripe_connect_account_id: null,
          stripe_connect_charges_enabled: false,
          stripe_connect_payouts_enabled: false,
          stripe_connect_details_submitted: false,
        })
        .eq('id', coachId)
    }
  }

  const account = await stripe.accounts.create({
    type: 'express',
    metadata: {
      coach_id: coachId,
    },
    business_profile: {
      name:
        profile?.business_name?.trim() ||
        profile?.full_name?.trim() ||
        undefined,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })

  const { error } = await admin
    .from('profiles')
    .update({ stripe_connect_account_id: account.id })
    .eq('id', coachId)

  if (error) {
    throw error
  }

  return account.id
}

export async function createConnectAccountLink(coachId: string): Promise<string> {
  const baseUrl = getAppBaseUrl()
  assertStripeLiveModeRedirects(baseUrl)

  const accountId = await getOrCreateConnectAccount(coachId)
  const stripe = getStripeClient()

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/settings?connect=refresh#payments`,
    return_url: `${baseUrl}/settings?connect=success#payments`,
    type: 'account_onboarding',
  })

  if (!accountLink.url) {
    throw new Error('Could not start Stripe Connect onboarding.')
  }

  return accountLink.url
}

/** Live keys require APP_URL to be https:// so Stripe can redirect after onboarding. */
export async function createConnectOnboardingUrl(coachId: string): Promise<string> {
  const baseUrl = getAppBaseUrl()
  if (isLiveModeHttpsBlocked(getStripeKeyMode(), baseUrl)) {
    throw new Error(LIVE_HTTPS_REQUIRED_MESSAGE)
  }

  if (getLiveModeHttpsRedirectError(baseUrl)) {
    throw new Error(LIVE_HTTPS_REQUIRED_MESSAGE)
  }

  return createConnectAccountLink(coachId)
}

export async function clearConnectAccount(coachId: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Billing service is unavailable.')
  }

  const { error } = await admin
    .from('profiles')
    .update({
      stripe_connect_account_id: null,
      stripe_connect_charges_enabled: false,
      stripe_connect_payouts_enabled: false,
      stripe_connect_details_submitted: false,
    })
    .eq('id', coachId)

  if (error) {
    throw error
  }
}

export async function createConnectDashboardLink(coachId: string): Promise<string> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Billing service is unavailable.')
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', coachId)
    .single()

  const accountId = profile?.stripe_connect_account_id
  if (!accountId) {
    throw new Error('Connect your Stripe account first.')
  }

  const stripe = getStripeClient()
  const loginLink = await stripe.accounts.createLoginLink(accountId)

  if (!loginLink.url) {
    throw new Error('Could not open Stripe dashboard.')
  }

  return loginLink.url
}

export async function refreshConnectAccountStatus(accountId: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Billing service is unavailable.')
  }

  const stripe = getStripeClient()
  const account = await stripe.accounts.retrieve(accountId)

  const coachId = account.metadata?.coach_id?.trim()
  if (!coachId) {
    return
  }

  const { error } = await admin
    .from('profiles')
    .update({
      stripe_connect_charges_enabled: account.charges_enabled ?? false,
      stripe_connect_payouts_enabled: account.payouts_enabled ?? false,
      stripe_connect_details_submitted: account.details_submitted ?? false,
    })
    .eq('id', coachId)
    .eq('stripe_connect_account_id', accountId)

  if (error) {
    throw error
  }
}

export function getClientBillingSuccessUrl(): string {
  return `${getAppBaseUrl()}/portal/billing?payment=success`
}

export function getClientBillingCancelUrl(): string {
  return `${getAppBaseUrl()}/portal/billing?payment=canceled`
}

export function getCoachBillingReturnUrl(): string {
  return `${getAppBaseUrl()}/billing`
}
