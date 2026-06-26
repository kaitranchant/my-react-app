import { test, expect } from './fixtures'

test.describe('Portal account settings', () => {
  test('account page loads notification sections', async ({ clientPage: page }) => {
    await page.goto('/portal/account')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByRole('heading', { name: 'Email alerts' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Browser notifications' })
    ).toBeVisible()
    await expect(
      page.getByText('Messages from your coach').first()
    ).toBeVisible()
  })

  test('notification toggle saves', async ({ clientPage: page }) => {
    await page.goto('/portal/account#notifications')
    await expect(page.getByRole('heading', { name: 'Email alerts' })).toBeVisible({
      timeout: 15_000,
    })

    const messageToggle = page.getByRole('switch', {
      name: 'Check-in feedback',
    })
    await expect(messageToggle).toBeVisible({ timeout: 15_000 })

    const wasChecked = await messageToggle.isChecked()
    await messageToggle.click()
    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 10_000 })

    await messageToggle.click()
    if (wasChecked) {
      await expect(messageToggle).toBeChecked()
    } else {
      await expect(messageToggle).not.toBeChecked()
    }
  })
})
