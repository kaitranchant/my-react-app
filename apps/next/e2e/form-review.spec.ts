import { test, expect, expandSidebarGroup, E2E_CLIENT_NAME } from './fixtures'

const E2E_FORM_REVIEW_TITLE = 'E2E Squat form check'
const E2E_FORM_REVIEW_NOTES = 'Please check my depth on set 3.'
const E2E_COACH_FEEDBACK = 'Good brace — try sitting back another inch.'

const fixtureVideo = {
  name: 'e2e-squat.mp4',
  mimeType: 'video/mp4',
  buffer: Buffer.from('e2e-form-review-video-placeholder'),
}

test.describe.configure({ mode: 'serial' })

test.describe('Form review', () => {
  test('client can open form review and upload a video', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/portal/form-review')
    await expect(page.getByRole('heading', { name: 'Form Review' })).toBeVisible()
    await expect(page.getByText('Submit form review')).toBeVisible()

    await page.getByLabel('Title (optional)').fill(E2E_FORM_REVIEW_TITLE)
    await page
      .getByLabel('Notes for your coach (optional)')
      .fill(E2E_FORM_REVIEW_NOTES)
    await page.getByRole('button', { name: 'Choose photo or video' }).click()
    await page.locator('#form-review-file').setInputFiles(fixtureVideo)
    await expect(page.getByRole('button', { name: 'e2e-squat.mp4' })).toBeVisible()
    await page.getByRole('button', { name: 'Submit for review' }).click()

    await expect(page.getByText('Form review submitted')).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(E2E_FORM_REVIEW_NOTES).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('coach can review a pending form submission', async ({
    coachPage: page,
  }) => {
    test.setTimeout(60_000)
    await expandSidebarGroup(page, 'Monitoring')
    await page.goto('/form-review')
    await expect(page).toHaveURL(/\/form-review/)
    await expect(page.getByRole('heading', { name: 'Form Review' })).toBeVisible()

    await expect(page.getByText(E2E_FORM_REVIEW_NOTES).first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(E2E_CLIENT_NAME).first()).toBeVisible()

    const reviewCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: E2E_FORM_REVIEW_NOTES })
      .first()
    const reviewButton = reviewCard.getByRole('button', { name: 'Review', exact: true })
    if (await reviewButton.isVisible()) {
      await reviewButton.click()
    }

    await reviewCard
      .getByPlaceholder('Share general cues, corrections, or encouragement…')
      .fill(E2E_COACH_FEEDBACK)
    await reviewCard.getByRole('button', { name: 'Save feedback' }).click()

    await expect(page.getByText('Feedback saved')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('No videos waiting for review')).toBeVisible({
      timeout: 10_000,
    })

    await page.getByRole('button', { name: /^All$/i }).click()
    await expect(page.getByText('Reviewed').first()).toBeVisible()
  })

  test('client sees coach feedback after review', async ({ clientPage: page }) => {
    await page.goto('/portal/form-review')
    await expect(page.getByText(E2E_FORM_REVIEW_TITLE)).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText('Reviewed')).toBeVisible()
    await expect(page.getByText(E2E_COACH_FEEDBACK)).toBeVisible()
  })
})
