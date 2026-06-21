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
    await page.goto('/portal/form-review')
    await expect(page.getByRole('heading', { name: 'Form Review' })).toBeVisible()
    await expect(page.getByText('Submit a video')).toBeVisible()

    await page.getByLabel('Title (optional)').fill(E2E_FORM_REVIEW_TITLE)
    await page
      .getByLabel('Notes for your coach (optional)')
      .fill(E2E_FORM_REVIEW_NOTES)
    await page.getByRole('button', { name: 'Choose video file' }).click()
    await page.locator('#form-review-file').setInputFiles(fixtureVideo)
    await expect(page.getByRole('button', { name: 'e2e-squat.mp4' })).toBeVisible()
    await page.getByRole('button', { name: 'Submit for review' }).click()

    await expect(page.getByText('Video submitted for review')).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText(E2E_FORM_REVIEW_TITLE)).toBeVisible()
    await expect(page.getByText('Awaiting review')).toBeVisible()
  })

  test('coach can review a pending form submission', async ({
    coachPage: page,
  }) => {
    await expandSidebarGroup(page, 'Monitoring')
    await page.getByRole('link', { name: 'Form Review', exact: true }).click()
    await expect(page).toHaveURL(/\/form-review/)
    await expect(page.getByRole('heading', { name: 'Form Review' })).toBeVisible()

    await page.getByRole('tab', { name: /Pending/i }).click()
    await expect(page.getByText(E2E_FORM_REVIEW_TITLE).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(E2E_CLIENT_NAME).first()).toBeVisible()
    await expect(page.getByText(E2E_FORM_REVIEW_NOTES).first()).toBeVisible()

    await page
      .getByPlaceholder('Share cues, corrections, or encouragement…')
      .fill(E2E_COACH_FEEDBACK)
    await page.getByRole('button', { name: 'Save feedback' }).click()

    await expect(page.getByText('Feedback saved')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('No videos waiting for review')).toBeVisible({
      timeout: 10_000,
    })

    await page.getByRole('tab', { name: /^All$/i }).click()
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
