import { test, expect, preparePortalHome } from './fixtures'
import path from 'node:path'

const fixtureImage = path.join(__dirname, 'fixtures', 'progress-photo.png')

test.describe.configure({ mode: 'serial' })

test.describe('Check-ins and progress photos', () => {
  test('client can submit a weekly check-in', async ({ clientPage: page }) => {
    test.setTimeout(60_000)
    await page.goto('/portal/check-in')
    await expect(page.getByRole('heading', { name: 'Check-in' })).toBeVisible()

    const submitButton = page.getByRole('button', { name: 'Submit check-in' })
    const canSubmitFresh = await submitButton
      .isVisible({ timeout: 5_000 })
      .catch(() => false)

    if (canSubmitFresh) {
      await expect(page.getByText('Weekly check-in')).toBeVisible()
      await page.getByLabel('Weight').fill('185')
      await page.getByLabel('Sleep duration').fill('7.5')
      await page.getByLabel('Notes for your coach').fill('Feeling good this week.')
      await submitButton.click()
      await expect(page).toHaveURL(/checkIn=submitted/, { timeout: 15_000 })
      await preparePortalHome(page)
      await expect(
        page.getByRole('status').filter({ hasText: 'Check-in recorded' })
      ).toBeVisible({ timeout: 15_000 })
      return
    }

    await expect(page.getByText('Submitted').first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('client can upload a progress photo before coach review', async ({
    clientPage: page,
  }) => {
    await page.goto('/portal/check-in')
    await page.getByRole('button', { name: /Upload|Replace/ }).first().click()
    await page.locator('input[type="file"]').first().setInputFiles(fixtureImage)
    await expect(page.getByText('Front photo uploaded')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('coach can review a pending check-in', async ({ coachPage: page }) => {
    await page.goto('/check-ins')
    await expect(page.getByRole('heading', { name: 'Check-ins' })).toBeVisible()

    await page.getByRole('tab', { name: /Pending/i }).click()
    await expect(page.getByText('Pending review').first()).toBeVisible({
      timeout: 15_000,
    })

    await page
      .getByPlaceholder('Share encouragement, adjustments, or next steps…')
      .first()
      .fill('Great consistency this week.')
    await page.getByRole('button', { name: 'Save response' }).first().click()

    await expect(page.getByText('Coach response saved')).toBeVisible({
      timeout: 10_000,
    })
    await page.reload()
    await page.getByRole('tab', { name: /Pending/i }).click()
    await expect(
      page.getByText(/No client check-ins waiting for review/i)
    ).toBeVisible({ timeout: 15_000 })
  })

  test('coach can see uploaded progress photos', async ({ coachPage: page }) => {
    await page.goto('/progress-photos')
    await expect(page.getByRole('heading', { name: 'Progress Photos' })).toBeVisible()
    await expect(page.getByText(/· Front/).first()).toBeVisible({ timeout: 15_000 })
  })
})
