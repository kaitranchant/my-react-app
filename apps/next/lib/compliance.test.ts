import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildComplianceClientRow,
  buildComplianceSummary,
  countMissedWorkouts,
  countSessionCompliance,
  filterComplianceRows,
  parseComplianceFilter,
  parseComplianceSort,
  sortComplianceRows,
} from './compliance'

describe('countMissedWorkouts', () => {
  it('counts past-due scheduled and in-progress sessions in the last 7 days', () => {
    const missed = countMissedWorkouts(
      [
        { scheduled_date: '2026-06-20', status: 'scheduled', completed_at: null },
        { scheduled_date: '2026-06-21', status: 'in_progress', completed_at: null },
        { scheduled_date: '2026-06-22', status: 'completed', completed_at: '2026-06-22T12:00:00Z' },
        { scheduled_date: '2026-06-23', status: 'scheduled', completed_at: null },
      ],
      '2026-06-24'
    )

    assert.equal(missed, 3)
  })
})

describe('buildComplianceClientRow', () => {
  it('prioritizes actionable issues for a client', () => {
    const row = buildComplianceClientRow(
      {
        clientId: 'client-1',
        clientName: 'Alex Rivera',
        avatarUrl: null,
        workouts: [
          { scheduled_date: '2026-06-20', status: 'scheduled', completed_at: null },
          { scheduled_date: '2026-06-22', status: 'completed', completed_at: '2026-06-22T12:00:00Z' },
        ],
        hasCheckInThisPeriod: false,
        pendingCheckInReviews: 1,
        unreadMessages: 2,
        pendingFormReviews: 0,
        nutritionConfigured: false,
        hasNutritionLogToday: false,
        hasMealPlanAssigned: false,
        loadContext: {
          clientId: 'client-1',
          clientName: 'Alex Rivera',
          daysSinceLastSession: 8,
          acwrRatio: 1.45,
          acwrRiskLevel: 'overreaching',
          hasInjuryFlag: false,
        },
      },
      {
        todayKey: '2026-06-24',
        weekStart: '2026-06-23',
        weekEnd: '2026-06-29',
        checkInPeriodLabel: 'this week',
      }
    )

    assert.ok(row.issueCount >= 4)
    assert.equal(row.pendingCheckInReviews, 1)
    assert.equal(row.unreadMessages, 2)
    assert.equal(row.missedWorkouts7d, 1)
    assert.equal(row.issues[0]?.kind, 'pending_check_in_review')
    assert.ok(row.issues.some((issue) => issue.kind === 'elevated_load'))
    assert.ok(row.issues.some((issue) => issue.kind === 'unread_message'))
    assert.ok(row.issues.some((issue) => issue.kind === 'overdue_check_in'))
  })
})

describe('compliance row helpers', () => {
  const rows = [
    {
      clientId: 'a',
      clientName: 'Zoe',
      avatarUrl: null,
      gymId: null,
      teamIds: [],
      issues: [{ kind: 'inactive' as const, priority: 'medium' as const, label: 'Inactive', href: '/clients/a' }],
      issueCount: 1,
      highestPriority: 'medium' as const,
      missedWorkouts7d: 0,
      sessionCompliance: null,
      daysSinceLastSession: 5,
      hasCheckInThisPeriod: true,
      pendingCheckInReviews: 0,
      unreadMessages: 0,
      pendingFormReviews: 0,
      nutritionConfigured: false,
      hasNutritionLogToday: false,
      hasMealPlanAssigned: false,
    },
    {
      clientId: 'b',
      clientName: 'Alex',
      avatarUrl: null,
      gymId: null,
      teamIds: [],
      issues: [],
      issueCount: 0,
      highestPriority: null,
      missedWorkouts7d: 2,
      sessionCompliance: { completed: 1, planned: 3 },
      daysSinceLastSession: 1,
      hasCheckInThisPeriod: true,
      pendingCheckInReviews: 0,
      unreadMessages: 0,
      pendingFormReviews: 0,
      nutritionConfigured: false,
      hasNutritionLogToday: false,
      hasMealPlanAssigned: false,
    },
  ]

  it('filters to clients needing attention', () => {
    assert.equal(filterComplianceRows(rows, 'needs_attention').length, 1)
    assert.equal(filterComplianceRows(rows, 'all').length, 2)
  })

  it('sorts by issue count first', () => {
    const sorted = sortComplianceRows(rows, 'issues')
    assert.equal(sorted[0]?.clientId, 'a')
  })

  it('builds summary counts', () => {
    const summary = buildComplianceSummary(rows)
    assert.equal(summary.totalClients, 2)
    assert.equal(summary.clientsNeedingAttention, 1)
    assert.equal(summary.missedWorkouts7d, 2)
    assert.equal(summary.inactiveClients, 1)
  })

  it('parses compliance filter from URL params', () => {
    assert.equal(parseComplianceFilter(undefined), 'all')
    assert.equal(parseComplianceFilter('all'), 'all')
    assert.equal(parseComplianceFilter('needs_attention'), 'needs_attention')
  })
})

describe('countSessionCompliance', () => {
  it('counts completed sessions against planned non-skipped workouts', () => {
    assert.deepEqual(
      countSessionCompliance(
        [
          { scheduled_date: '2026-06-23', status: 'completed', completed_at: '2026-06-23T12:00:00Z' },
          { scheduled_date: '2026-06-24', status: 'scheduled', completed_at: null },
          { scheduled_date: '2026-06-25', status: 'skipped', completed_at: null },
        ],
        '2026-06-23',
        '2026-06-25'
      ),
      { completed: 1, planned: 2 }
    )
  })
})
