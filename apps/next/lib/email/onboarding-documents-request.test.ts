import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildOnboardingDocumentsEmailContent } from '@/lib/email/onboarding-documents-request'

describe('onboarding documents request email', () => {
  it('includes document names and sign url', () => {
    const content = buildOnboardingDocumentsEmailContent({
      clientName: 'Alex',
      clientEmail: 'alex@example.com',
      coachName: 'Coach Kim',
      signUrl: 'https://app.example.com/sign?token=abc',
      documentNames: ['PAR-Q', 'Liability waiver'],
    })

    assert.match(content.subject, /Coach Kim/)
    assert.match(content.text, /PAR-Q/)
    assert.match(content.text, /sign\?token=abc/)
    assert.match(content.html, /Liability waiver/)
  })
})
