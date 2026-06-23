import assert from 'node:assert/strict'
import test from 'node:test'

import { buildProactiveAlerts } from './proactive-alerts'

const baseClient = {
  clientId: 'client-1',
  clientName: 'Jake Morrison',
  daysSinceLastSession: 5,
  acwrRatio: 1.4,
  acwrRiskLevel: 'borderline' as const,
  hasInjuryFlag: false,
}

test('buildProactiveAlerts surfaces named inactive, ACWR, injury, and check-in alerts', () => {
  const alerts = buildProactiveAlerts({
    clientContexts: [
      baseClient,
      {
        clientId: 'client-2',
        clientName: 'Sarah Chen',
        daysSinceLastSession: 2,
        acwrRatio: 1.42,
        acwrRiskLevel: 'overreaching',
        hasInjuryFlag: true,
      },
    ],
    pendingCheckInsCount: 3,
  })

  assert.equal(alerts.length, 5)
  assert.equal(alerts[0]?.message, '3 client check-ins awaiting review')
  assert.equal(alerts[0]?.href, '/check-ins')
  assert.match(alerts[1]?.message ?? '', /Sarah flagged pain/)
  assert.match(alerts[2]?.message ?? '', /Sarah's ACWR hit 1\.42/)
  assert.equal(alerts[2]?.href, '/load?client=client-2')
  assert.match(alerts[3]?.message ?? '', /Jake's ACWR is at 1\.40/)
  assert.equal(alerts[4]?.message, "Jake hasn't trained in 5 days")
  assert.equal(alerts[4]?.href, '/clients/client-1?tab=training')
})

test('buildProactiveAlerts skips inactive clients below threshold', () => {
  const alerts = buildProactiveAlerts({
    clientContexts: [
      {
        ...baseClient,
        daysSinceLastSession: 2,
        acwrRatio: 1.1,
        acwrRiskLevel: 'optimal',
      },
    ],
    pendingCheckInsCount: 0,
  })

  assert.equal(alerts.length, 0)
})

test('buildProactiveAlerts caps output at eight alerts', () => {
  const alerts = buildProactiveAlerts({
    clientContexts: Array.from({ length: 12 }, (_, index) => ({
      clientId: `client-${index}`,
      clientName: `Athlete ${index}`,
      daysSinceLastSession: 6,
      acwrRatio: null,
      acwrRiskLevel: 'unknown' as const,
      hasInjuryFlag: false,
    })),
    pendingCheckInsCount: 0,
  })

  assert.equal(alerts.length, 8)
})
