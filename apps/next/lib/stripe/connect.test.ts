import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type Stripe from 'stripe'

import {
  getConnectAccountLinkType,
  pickBestConnectAccount,
  scoreConnectAccount,
} from './connect'

function account(
  overrides: Partial<Stripe.Account> & { id: string }
): Stripe.Account {
  return {
    object: 'account',
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: false,
    metadata: {},
    requirements: null,
    ...overrides,
  } as Stripe.Account
}

describe('connect account helpers', () => {
  it('scores enabled accounts higher', () => {
    const enabled = account({
      id: 'acct_enabled',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })
    const pending = account({ id: 'acct_pending' })
    assert.ok(scoreConnectAccount(enabled) > scoreConnectAccount(pending))
  })

  it('picks the best account for a coach', () => {
    const preferred = account({ id: 'acct_old', details_submitted: true })
    const enabled = account({
      id: 'acct_new',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })

    assert.equal(
      pickBestConnectAccount([preferred, enabled], 'acct_old')?.id,
      'acct_new'
    )
  })

  it('uses account_update when details are submitted', () => {
    assert.equal(
      getConnectAccountLinkType(
        account({ id: 'acct_1', details_submitted: true })
      ),
      'account_update'
    )
  })

  it('uses account_update when requirements are past due', () => {
    assert.equal(
      getConnectAccountLinkType(
        account({
          id: 'acct_1',
          requirements: { past_due: ['tos_acceptance.date'] } as Stripe.Account.Requirements,
        })
      ),
      'account_update'
    )
  })

  it('uses account_onboarding for new accounts', () => {
    assert.equal(
      getConnectAccountLinkType(account({ id: 'acct_1' })),
      'account_onboarding'
    )
  })
})
