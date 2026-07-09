import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  aggregateAttendanceRate,
  aggregateSessionCompletionRate,
  buildCoachMetricsRows,
  buildGymClientList,
  buildGymOwnerDashboard,
  filterClientsByCoach,
  formatGymMetricsCsv,
  filterGymDashboardByCoach,
  parseGymCoachFilter,
} from './gym-metrics'
import type { ComplianceClientRow } from './compliance'

function complianceRow(
  clientId: string,
  overrides: Partial<ComplianceClientRow> = {}
): ComplianceClientRow {
  return {
    clientId,
    clientName: clientId,
    avatarUrl: null,
    issues: [],
    issueCount: 0,
    highestPriority: null,
    missedWorkouts7d: 0,
    sessionCompliance: null,
    daysSinceLastSession: null,
    hasCheckInThisPeriod: true,
    pendingCheckInReviews: 0,
    unreadMessages: 0,
    pendingFormReviews: 0,
    ...overrides,
  }
}

describe('parseGymCoachFilter', () => {
  it('returns null for missing or invalid coach ids', () => {
    const memberCoachIds = new Set(['coach-a', 'coach-b'])
    assert.equal(parseGymCoachFilter(undefined, memberCoachIds), null)
    assert.equal(parseGymCoachFilter('coach-z', memberCoachIds), null)
  })

  it('returns the coach id when it belongs to the gym', () => {
    const memberCoachIds = new Set(['coach-a', 'coach-b'])
    assert.equal(parseGymCoachFilter('coach-a', memberCoachIds), 'coach-a')
  })
})

describe('filterClientsByCoach', () => {
  it('returns only clients for the selected coach', () => {
    const clients = [
      {
        id: 'client-1',
        full_name: 'One',
        avatar_url: null,
        status: 'active' as const,
        coaching_type: null,
        gym_id: 'gym-1',
        memberships: [],
      },
      {
        id: 'client-2',
        full_name: 'Two',
        avatar_url: null,
        status: 'active' as const,
        coaching_type: null,
        gym_id: 'gym-1',
        memberships: [],
      },
    ]

    const filtered = filterClientsByCoach(
      clients,
      [
        { id: 'client-1', coach_id: 'coach-a' },
        { id: 'client-2', coach_id: 'coach-b' },
      ],
      'coach-a'
    )

    assert.equal(filtered.length, 1)
    assert.equal(filtered[0]?.id, 'client-1')
  })
})

describe('aggregateAttendanceRate', () => {
  it('returns null when no sessions were logged', () => {
    assert.equal(aggregateAttendanceRate([]), null)
    assert.equal(
      aggregateAttendanceRate([{ monthAttended: 0, monthTotal: 0 }]),
      null
    )
  })

  it('returns rounded percentage across clients', () => {
    assert.equal(
      aggregateAttendanceRate([
        { monthAttended: 8, monthTotal: 10 },
        { monthAttended: 6, monthTotal: 10 },
      ]),
      70
    )
  })
})

describe('aggregateSessionCompletionRate', () => {
  it('returns null when no planned sessions exist', () => {
    assert.equal(aggregateSessionCompletionRate([]), null)
  })

  it('aggregates completed and planned sessions', () => {
    assert.equal(
      aggregateSessionCompletionRate([
        complianceRow('a', {
          sessionCompliance: { completed: 3, planned: 4 },
        }),
        complianceRow('b', {
          sessionCompliance: { completed: 1, planned: 4 },
        }),
      ]),
      50
    )
  })
})

describe('buildCoachMetricsRows', () => {
  it('groups metrics by coach', () => {
    const rows = buildCoachMetricsRows(
      [
        {
          id: 'member-a',
          gym_id: 'gym-1',
          coach_id: 'coach-a',
          role: 'coach',
          status: 'active',
          joined_at: '2026-01-01T00:00:00Z',
          profile: {
            id: 'coach-a',
            full_name: 'Alice',
            avatar_url: null,
            business_name: null,
          },
        },
        {
          id: 'member-b',
          gym_id: 'gym-1',
          coach_id: 'coach-b',
          role: 'coach',
          status: 'active',
          joined_at: '2026-01-01T00:00:00Z',
          profile: {
            id: 'coach-b',
            full_name: 'Bob',
            avatar_url: null,
            business_name: null,
          },
        },
      ],
      new Map([
        [
          'coach-a',
          [
            {
              id: 'client-1',
              full_name: 'Client One',
              avatar_url: null,
              status: 'active',
              coaching_type: null,
              gym_id: 'gym-1',
              memberships: [],
            },
          ],
        ],
      ]),
      new Map([
        [
          'client-1',
          complianceRow('client-1', {
            issueCount: 1,
            issues: [
              {
                kind: 'injury_flag',
                priority: 'high',
                label: 'Pain flagged',
                href: '/clients/client-1',
              },
            ],
            sessionCompliance: { completed: 2, planned: 4 },
          }),
        ],
      ]),
      new Map([['client-1', { monthAttended: 4, monthTotal: 5 }]])
    )

    assert.equal(rows.length, 2)
    assert.deepEqual(rows[0], {
      coachId: 'coach-a',
      coachName: 'Alice',
      activeClients: 1,
      attendanceRate: 80,
      sessionCompletionRate: 50,
      clientsNeedingAttention: 1,
      elevatedLoadClients: 0,
      injuryFlagClients: 1,
    })
    assert.deepEqual(rows[1], {
      coachId: 'coach-b',
      coachName: 'Bob',
      activeClients: 0,
      attendanceRate: null,
      sessionCompletionRate: null,
      clientsNeedingAttention: 0,
      elevatedLoadClients: 0,
      injuryFlagClients: 0,
    })
  })
})

describe('buildGymClientList', () => {
  const members = [
    {
      id: 'member-a',
      gym_id: 'gym-1',
      coach_id: 'coach-a',
      role: 'coach' as const,
      status: 'active' as const,
      joined_at: '2026-01-01T00:00:00Z',
      profile: {
        id: 'coach-a',
        full_name: 'Alice',
        avatar_url: null,
        business_name: null,
      },
    },
    {
      id: 'member-b',
      gym_id: 'gym-1',
      coach_id: 'coach-b',
      role: 'coach' as const,
      status: 'active' as const,
      joined_at: '2026-01-01T00:00:00Z',
      profile: {
        id: 'coach-b',
        full_name: 'Bob',
        avatar_url: null,
        business_name: null,
      },
    },
  ]

  const clients = [
    {
      id: 'client-1',
      full_name: 'Zara',
      avatar_url: null,
      status: 'active' as const,
      coaching_type: null,
      gym_id: 'gym-1',
      memberships: [],
    },
    {
      id: 'client-2',
      full_name: 'Amy',
      avatar_url: null,
      status: 'active' as const,
      coaching_type: null,
      gym_id: 'gym-1',
      memberships: [],
    },
  ]

  it('builds per-client rows sorted by name', () => {
    const rows = buildGymClientList(
      clients,
      [
        { id: 'client-1', coach_id: 'coach-a' },
        { id: 'client-2', coach_id: 'coach-b' },
      ],
      members,
      new Map([
        [
          'client-1',
          complianceRow('client-1', {
            issueCount: 2,
            sessionCompliance: { completed: 1, planned: 3 },
          }),
        ],
        [
          'client-2',
          complianceRow('client-2', {
            issueCount: 0,
            sessionCompliance: { completed: 4, planned: 4 },
          }),
        ],
      ]),
      new Map([
        ['client-1', { monthAttended: 3, monthTotal: 4 }],
        ['client-2', { monthAttended: 0, monthTotal: 0 }],
      ])
    )

    assert.equal(rows.length, 2)
    assert.equal(rows[0]?.clientName, 'Amy')
    assert.equal(rows[0]?.coachName, 'Bob')
    assert.equal(rows[0]?.attendanceRate, null)
    assert.equal(rows[1]?.clientName, 'Zara')
    assert.equal(rows[1]?.coachName, 'Alice')
    assert.equal(rows[1]?.attendanceRate, 75)
    assert.equal(rows[1]?.issueCount, 2)
  })

  it('marks gym member coach self clients', () => {
    const rows = buildGymClientList(
      [
        ...clients,
        {
          id: 'coach-self-a',
          full_name: 'Alice',
          avatar_url: null,
          status: 'active' as const,
          coaching_type: null,
          gym_id: 'gym-1',
          memberships: [],
        },
      ],
      [
        { id: 'client-1', coach_id: 'coach-a' },
        { id: 'client-2', coach_id: 'coach-b' },
        { id: 'coach-self-a', coach_id: 'coach-a' },
      ],
      members,
      new Map(),
      new Map(),
      new Set(['coach-self-a'])
    )

    const coachRow = rows.find((row) => row.clientId === 'coach-self-a')
    assert.equal(coachRow?.isGymCoachMember, true)
    assert.equal(
      rows.find((row) => row.clientId === 'client-1')?.isGymCoachMember,
      false
    )
  })
})

describe('filterGymDashboardByCoach', () => {
  it('scopes summary metrics to the selected coach', () => {
    const dashboard = {
      ...buildGymOwnerDashboard([], [], [], [], new Map(), 'June 2026'),
      hasSharedClients: true,
      coaches: [
        {
          coachId: 'coach-a',
          coachName: 'Alice',
          activeClients: 3,
          attendanceRate: 80,
          sessionCompletionRate: 70,
          clientsNeedingAttention: 1,
          elevatedLoadClients: 0,
          injuryFlagClients: 1,
        },
        {
          coachId: 'coach-b',
          coachName: 'Bob',
          activeClients: 1,
          attendanceRate: 50,
          sessionCompletionRate: 40,
          clientsNeedingAttention: 0,
          elevatedLoadClients: 1,
          injuryFlagClients: 0,
        },
      ],
      clients: [
        {
          clientId: 'client-1',
          clientName: 'One',
          avatarUrl: null,
          coachId: 'coach-a',
          coachName: 'Alice',
          attendanceRate: 80,
          sessionCompletion: { completed: 2, planned: 4 },
          issueCount: 1,
        },
        {
          clientId: 'client-2',
          clientName: 'Two',
          avatarUrl: null,
          coachId: 'coach-b',
          coachName: 'Bob',
          attendanceRate: 50,
          sessionCompletion: { completed: 1, planned: 4 },
          issueCount: 0,
        },
      ],
    }

    const filtered = filterGymDashboardByCoach(dashboard, 'coach-b')

    assert.equal(filtered.selectedCoachId, 'coach-b')
    assert.equal(filtered.summary.totalActiveClients, 1)
    assert.equal(filtered.summary.attendanceRate, 50)
    assert.equal(filtered.summary.sessionCompletionRate, 40)
    assert.equal(filtered.coaches.length, 2)
    assert.equal(filtered.clients.length, 1)
    assert.equal(filtered.clients[0]?.clientId, 'client-2')
  })
})

describe('formatGymMetricsCsv', () => {
  it('supports anonymized coach labels', () => {
    const dashboard = buildGymOwnerDashboard(
      [
        {
          id: 'member-a',
          gym_id: 'gym-1',
          coach_id: 'coach-a',
          role: 'coach',
          status: 'active',
          joined_at: '2026-01-01T00:00:00Z',
          profile: {
            id: 'coach-a',
            full_name: 'Alice',
            avatar_url: null,
            business_name: null,
          },
        },
      ],
      [],
      [],
      [],
      new Map(),
      'June 2026'
    )

    const csv = formatGymMetricsCsv(
      {
        ...dashboard,
        coaches: [
          {
            coachId: 'coach-a',
            coachName: 'Alice',
            activeClients: 3,
            attendanceRate: 80,
            sessionCompletionRate: 70,
            clientsNeedingAttention: 1,
            elevatedLoadClients: 0,
            injuryFlagClients: 1,
          },
        ],
      },
      { anonymize: true, gymName: 'Iron Temple' }
    )

    assert.match(csv, /Coach,Active clients/)
    assert.match(csv, /Coach A,3,80%,70%/)
    assert.doesNotMatch(csv, /Alice/)
  })
})
