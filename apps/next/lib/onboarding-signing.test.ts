import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  countPendingOnboardingDocuments,
  getNextPendingSigningRequest,
  isOnboardingPacketComplete,
  signerEmailMatchesPacket,
  summarizeClientOnboardingDocuments,
} from '@/lib/onboarding-signing'

describe('onboarding-signing', () => {
  it('detects complete packets', () => {
    assert.equal(
      isOnboardingPacketComplete([{ status: 'signed' }, { status: 'signed' }]),
      true
    )
    assert.equal(
      isOnboardingPacketComplete([{ status: 'signed' }, { status: 'pending' }]),
      false
    )
  })

  it('counts pending documents', () => {
    assert.equal(
      countPendingOnboardingDocuments([
        { status: 'signed' },
        { status: 'pending' },
        { status: 'pending' },
      ]),
      2
    )
  })

  it('summarizes client onboarding document status', () => {
    assert.equal(summarizeClientOnboardingDocuments([]), 'none')
    assert.equal(
      summarizeClientOnboardingDocuments([{ status: 'pending' }]),
      'pending'
    )
    assert.equal(
      summarizeClientOnboardingDocuments([
        { status: 'signed' },
        { status: 'signed' },
      ]),
      'complete'
    )
  })

  it('finds the next pending signing request', () => {
    const next = getNextPendingSigningRequest([
      { id: 'a', status: 'signed', sort_order: 0 },
      { id: 'b', status: 'pending', sort_order: 2 },
      { id: 'c', status: 'pending', sort_order: 1 },
    ])

    assert.equal(next?.id, 'c')
  })

  it('validates signer email against packet email', () => {
    assert.equal(
      signerEmailMatchesPacket('Client@Example.com', 'client@example.com'),
      true
    )
    assert.equal(
      signerEmailMatchesPacket('client@example.com', 'other@example.com'),
      false
    )
    assert.equal(signerEmailMatchesPacket(null, 'any@example.com'), true)
  })
})
