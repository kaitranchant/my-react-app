import type Stripe from 'stripe'

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

export function scoreConnectAccount(account: Stripe.Account): number {
  let score = 0
  if (account.charges_enabled) score += 4
  if (account.payouts_enabled) score += 2
  if (account.details_submitted) score += 1
  return score
}

export function pickBestConnectAccount(
  accounts: Stripe.Account[],
  preferredAccountId: string | null
): Stripe.Account | null {
  if (accounts.length === 0) return null

  const sorted = [...accounts].sort((left, right) => {
    const scoreDiff = scoreConnectAccount(right) - scoreConnectAccount(left)
    if (scoreDiff !== 0) return scoreDiff
    if (preferredAccountId) {
      if (left.id === preferredAccountId) return -1
      if (right.id === preferredAccountId) return 1
    }
    return 0
  })

  return sorted[0] ?? null
}

export function getConnectAccountLinkType(
  account: Stripe.Account
): 'account_onboarding' | 'account_update' {
  if (account.details_submitted) {
    return 'account_update'
  }

  const requirements = account.requirements
  if (
    (requirements?.past_due?.length ?? 0) > 0 ||
    (requirements?.currently_due?.length ?? 0) > 0
  ) {
    return 'account_update'
  }

  return 'account_onboarding'
}

function mapStripeAccountToConnectStatus(
  account: Stripe.Account
): ConnectAccountStatus {
  return {
    accountId: account.id,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    isReady: Boolean(
      account.id && account.charges_enabled && account.details_submitted
    ),
  }
}

async function listCoachConnectAccounts(
  stripe: Stripe,
  coachId: string,
  storedAccountId: string | null
): Promise<Stripe.Account[]> {
  const byId = new Map<string, Stripe.Account>()

  if (storedAccountId) {
    try {
      const stored = await stripe.accounts.retrieve(storedAccountId)
      byId.set(stored.id, stored)
    } catch {
      // Stored account id is stale.
    }
  }

  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const page = await stripe.accounts.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const account of page.data) {
      if (account.metadata?.coach_id === coachId) {
        byId.set(account.id, account)
      }
    }

    hasMore = page.has_more
    startingAfter = page.data.at(-1)?.id
    if (!startingAfter) {
      hasMore = false
    }
  }

  return Array.from(byId.values())
}

async function persistConnectAccountStatus(
  coachId: string,
  account: Stripe.Account
): Promise<ConnectAccountStatus> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Billing service is unavailable.')
  }

  const status = mapStripeAccountToConnectStatus(account)
  const { error } = await admin
    .from('profiles')
    .update({
      stripe_connect_account_id: account.id,
      stripe_connect_charges_enabled: status.chargesEnabled,
      stripe_connect_payouts_enabled: status.payoutsEnabled,
      stripe_connect_details_submitted: status.detailsSubmitted,
    })
    .eq('id', coachId)

  if (error) {
    throw error
  }

  return status
}

/** Pull live Connect status from Stripe and reconcile duplicate coach accounts. */
export async function syncCoachConnectStatus(
  coachId: string
): Promise<ConnectAccountStatus> {
  if (!isStripeConfigured()) {
    throw new Error('Stripe is not configured.')
  }

  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Billing service is unavailable.')
  }

  const stripe = getStripeClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', coachId)
    .maybeSingle()

  const storedAccountId = profile?.stripe_connect_account_id ?? null
  const coachAccounts = await listCoachConnectAccounts(
    stripe,
    coachId,
    storedAccountId
  )
  const bestAccount = pickBestConnectAccount(coachAccounts, storedAccountId)

  if (!bestAccount) {
    if (storedAccountId) {
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

    return {
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      isReady: false,
    }
  }

  if (bestAccount.metadata?.coach_id !== coachId) {
    await stripe.accounts.update(bestAccount.id, {
      metadata: {
        ...bestAccount.metadata,
        coach_id: coachId,
      },
    })
  }

  return persistConnectAccountStatus(coachId, bestAccount)
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
  const account = await stripe.accounts.retrieve(accountId)

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/settings?connect=refresh#payments`,
    return_url: `${baseUrl}/settings?connect=success#payments`,
    type: getConnectAccountLinkType(account),
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

  let coachId = account.metadata?.coach_id?.trim()
  if (!coachId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('stripe_connect_account_id', accountId)
      .maybeSingle()
    coachId = profile?.id
  }

  if (!coachId) {
    return
  }

  await persistConnectAccountStatus(coachId, account)
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
