import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { resolveClientsScope, resolveClientsListStatus } from './clients-list-query'

const gyms = [
  { id: 'gym-a', name: 'Pivot Extreme' },
  { id: 'gym-b', name: 'Iron Temple' },
]

describe('resolveClientsScope', () => {
  it('returns all or personal for independent coaches', () => {
    assert.equal(resolveClientsScope(undefined, gyms), 'all')
    assert.equal(resolveClientsScope('personal', gyms), 'personal')
    assert.equal(resolveClientsScope('gym-a', gyms), 'gym-a')
  })

  it('forces gym scope for invited-only coaches', () => {
    assert.equal(
      resolveClientsScope(undefined, gyms, { gymInvitedOnly: true }),
      'gym-a'
    )
    assert.equal(
      resolveClientsScope('personal', gyms, { gymInvitedOnly: true }),
      'gym-a'
    )
    assert.equal(
      resolveClientsScope('all', gyms, { gymInvitedOnly: true }),
      'gym-a'
    )
    assert.equal(
      resolveClientsScope('gym-b', gyms, { gymInvitedOnly: true }),
      'gym-b'
    )
  })
})

describe('resolveClientsListStatus', () => {
  it('hides archived clients by default', () => {
    assert.equal(resolveClientsListStatus(undefined), 'current')
    assert.equal(resolveClientsListStatus('all'), 'current')
  })

  it('keeps explicit status filters including archive', () => {
    assert.equal(resolveClientsListStatus('active'), 'active')
    assert.equal(resolveClientsListStatus('paused'), 'paused')
    assert.equal(resolveClientsListStatus('archived'), 'archived')
  })
})
