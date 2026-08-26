import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  mergeSearchResults,
  searchLoadedIndex,
  type GlobalSearchIndex,
} from './global-search'

const index: GlobalSearchIndex = {
  clients: [
    { id: '1', full_name: 'Feliz Martinez', email: 'feliz@example.com' },
    { id: '2', full_name: 'Liz McIntosh', email: 'liz@example.com' },
    { id: '3', full_name: 'Aaron Miller', email: 'aaron@example.com' },
  ],
  workouts: [{ id: 'w1', name: 'Liz Upper', description: null }],
  programs: [],
  mealPlans: [],
}

describe('searchLoadedIndex', () => {
  it('returns Liz McIntosh first for first or last name', () => {
    assert.equal(searchLoadedIndex(index, 'liz')[0]?.title, 'Liz McIntosh')
    assert.equal(searchLoadedIndex(index, 'mcintosh')[0]?.title, 'Liz McIntosh')
  })
})

describe('mergeSearchResults', () => {
  it('appends new types without duplicating ids', () => {
    const local = searchLoadedIndex(index, 'liz')
    const merged = mergeSearchResults(local, [
      {
        id: '2',
        type: 'client',
        title: 'Liz McIntosh',
        href: '/clients/2',
      },
      {
        id: 'e1',
        type: 'exercise',
        title: 'Lizard crawl',
        href: '/library/exercises?q=Lizard%20crawl',
      },
    ])

    assert.equal(
      merged.filter((result) => result.type === 'client' && result.id === '2')
        .length,
      1
    )
    assert.equal(merged.some((result) => result.type === 'exercise'), true)
  })
})
