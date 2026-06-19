import { test, expect } from './fixtures'

test.describe('Check-ins', () => {
  test('client can submit a weekly check-in', async ({ clientPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Weekly check-in' })).toBeVisible()

    await page.getByLabel('Weight').fill('185')
    await page.getByLabel('Sleep duration').fill('7.5')
    await page.getByRole('button', { name: '4', exact: true }).first().click()
    await page.getByLabel('Notes for your coach').fill('Feeling good this week.')
    await page.getByRole('button', { name: 'Submit check-in' }).click()

    await expect(page.getByText('185 lbs')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Submitted')).toBeVisible()
  })

  test('coach can review a pending check-in', async ({ coachPage: page }) => {
    await page.goto('/check-ins')
    await expect(page.getByRole('heading', { name: 'Check-ins' })).toBeVisible()

    const pendingTab = page.getByRole('tab', { name: /Pending/i })
    await pendingTab.click()

    await expect(page.getByText('185 lbs')).toBeVisible({ timeout: 15_000 })

    await page
      .getByPlaceholder('Share encouragement, adjustments, or next steps…')
      .fill('Great consistency this week.')
    await page.getByRole('button', { name: 'Save response' }).click()

    await expect(page.getByText('Reviewed')).toBeVisible({ timeout: 10_000 })
  })
})
