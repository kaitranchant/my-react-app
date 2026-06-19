import { test, expect } from './fixtures'
import path from 'node:path'

const fixtureImage = path.join(__dirname, 'fixtures', 'progress-photo.png')

test.describe('Progress photos', () => {
  test('client can upload a progress photo on check-in', async ({
    clientPage: page,
  }) => {
    await page.goto('/portal/check-in')
    await expect(page.getByRole('heading', { name: 'Check-in' })).toBeVisible()

    await page.getByLabel('Weight').fill('180')
    await page.getByLabel('Sleep duration').fill('7')
    await page.getByRole('button', { name: 'Submit check-in' }).click()
    await expect(page.getByText('Submitted')).toBeVisible({ timeout: 10_000 })

    const frontUpload = page
      .locator('div')
      .filter({ hasText: /^Front/ })
      .getByRole('button', { name: 'Upload' })
      .first()
    await frontUpload.click()

    await page.locator('input[type="file"]').first().setInputFiles(fixtureImage)
    await expect(page.getByText('Front photo uploaded')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('coach can see uploaded progress photos', async ({ coachPage: page }) => {
    await page.goto('/progress-photos')
    await expect(page.getByRole('heading', { name: 'Progress Photos' })).toBeVisible()
    await expect(page.getByText('Front')).toBeVisible({ timeout: 15_000 })
  })
})
