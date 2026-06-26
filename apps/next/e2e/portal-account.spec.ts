import { test, expect, dismissPortalWelcomeDialog } from './fixtures'

test.describe('Portal account settings', () => {
  test('account page loads notification sections', async ({ clientPage: page }) => {
    await page.goto('/portal/account')
    await dismissPortalWelcomeDialog(page)
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({
      timeout: 15_000,
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
    await dismissPortalWelcomeDialog(page)

    const teamToggle = page.getByRole('switch', {
      name: 'Team announcements and events',
    })
    await expect(teamToggle).toBeVisible({ timeout: 15_000 })

    const wasChecked = await teamToggle.isChecked()
    await teamToggle.click()
    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 10_000 })

    await teamToggle.click()
    if (wasChecked) {
      await expect(teamToggle).toBeChecked()
    } else {
      await expect(teamToggle).not.toBeChecked()
    }
  })
})
