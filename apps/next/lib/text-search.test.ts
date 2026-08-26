import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildPostgrestIlikeOrFilter,
  matchesSearchQuery,
  rankBySearch,
  scoreSearchMatch,
  simpleIlikeContains,
  tokenizeSearchQuery,
} from './text-search'

const liz = ['Liz McIntosh', 'liz@example.com']

describe('tokenizeSearchQuery', () => {
  it('splits on spaces and strips punctuation', () => {
    assert.deepEqual(tokenizeSearchQuery('  Liz, McIntosh '), ['liz', 'mcintosh'])
  })
})

describe('matchesSearchQuery', () => {
  it('matches first name, last name, and either order', () => {
    assert.equal(matchesSearchQuery(liz, 'liz'), true)
    assert.equal(matchesSearchQuery(liz, 'mcintosh'), true)
    assert.equal(matchesSearchQuery(liz, 'Liz McIntosh'), true)
    assert.equal(matchesSearchQuery(liz, 'mcintosh liz'), true)
  })

  it('matches last-name prefixes used while typing', () => {
    assert.equal(matchesSearchQuery(liz, 'mc'), true)
    assert.equal(matchesSearchQuery(liz, 'McIn'), true)
  })

  it('matches names even when spacing differs', () => {
    assert.equal(matchesSearchQuery(['Liz Mc Intosh'], 'mcintosh'), true)
    assert.equal(matchesSearchQuery(['Liz McIntosh'], 'mc intosh'), true)
  })

  it('matches common nicknames for Elizabeth', () => {
    assert.equal(matchesSearchQuery(['Elizabeth McIntosh'], 'liz'), true)
    assert.equal(matchesSearchQuery(['Liz McIntosh'], 'elizabeth'), true)
  })

  it('requires every token to match', () => {
    assert.equal(matchesSearchQuery(liz, 'liz miller'), false)
  })
})

describe('scoreSearchMatch', () => {
  it('ranks first-name hits above substring hits', () => {
    const lizScore = scoreSearchMatch(liz, 'liz')
    const felizScore = scoreSearchMatch(['Feliz Martinez'], 'liz')
    assert.ok(lizScore > felizScore)
  })

  it('ranks last-name hits above unrelated contains matches', () => {
    const lizScore = scoreSearchMatch(liz, 'mcintosh')
    const otherScore = scoreSearchMatch(['Aaron McIntoshson'], 'mcintosh')
    assert.ok(lizScore > otherScore)
  })
})

describe('rankBySearch', () => {
  it('keeps Liz McIntosh when many names share a letter', () => {
    const ranked = rankBySearch(
      [
        { name: 'Aaron Miller' },
        { name: 'Alina Lopez' },
        { name: 'Blake Hall' },
        { name: 'Carla Walsh' },
        { name: 'Daniel Cole' },
        { name: 'Elena Flores' },
        { name: 'Feliz Martinez' },
        { name: 'Grace Ball' },
        { name: 'Liz McIntosh' },
        { name: 'Olivia Bell' },
      ],
      'liz',
      (item) => [item.name],
      8
    )

    assert.equal(ranked[0]?.name, 'Liz McIntosh')
  })
})

describe('buildPostgrestIlikeOrFilter', () => {
  it('quotes ilike values so commas and percent signs stay intact', () => {
    const filter = buildPostgrestIlikeOrFilter(['full_name', 'email'], 'liz')
    assert.ok(filter)
    assert.match(filter, /full_name\.ilike\."liz%"/)
    assert.match(filter, /full_name\.ilike\."%liz%"/)
    assert.match(filter, /email\.ilike\."%liz%"/)
    assert.doesNotMatch(filter, /ilike\.%liz%/)
  })

  it('uses the most selective token for multi-word queries', () => {
    const filter = buildPostgrestIlikeOrFilter(
      ['full_name', 'email'],
      'liz mcintosh'
    )
    assert.ok(filter)
    assert.match(filter, /mcintosh/i)
  })

  it('keeps commas inside quoted values', () => {
    const filter = buildPostgrestIlikeOrFilter(['full_name'], 'McIntosh, Liz')
    assert.ok(filter)
    assert.doesNotMatch(filter, /ilike\.%/)
  })
})

describe('simpleIlikeContains', () => {
  it('uses the longest token as a contains pattern', () => {
    assert.equal(simpleIlikeContains('liz mcintosh'), '%mcintosh%')
  })
})
