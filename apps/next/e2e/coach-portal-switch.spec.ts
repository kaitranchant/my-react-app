import { test, expect } from './fixtures'

test.describe('Coach portal switch', () => {
  test('coach can switch between dashboard and client portal', async ({
    coachPage: page,
  }) => {
    test.setTimeout(60_000)

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    const switcher = page.getByTestId('app-surface-switcher')
    await expect(switcher).toBeVisible({ timeout: 15_000 })

    await switcher.getByRole('button', { name: 'Client' }).click()
    await expect(page).toHaveURL(/\/portal(?:\/|$)/, { timeout: 15_000 })
    await expect(page.getByTestId('app-surface-switcher')).toBeVisible({
      timeout: 15_000,
    })

    await switcher.getByRole('button', { name: 'Coach' }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })
})
