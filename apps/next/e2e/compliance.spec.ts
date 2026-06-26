import { test, expect, E2E_CLIENT_NAME, E2E_CLIENT_ID } from './fixtures'

test.describe('Compliance dashboard', () => {
  test('loads summary and client table', async ({ coachPage: page }) => {
    await page.goto('/compliance')
    await expect(
      page.getByRole('heading', { name: 'Compliance' })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Need attention').first()).toBeVisible()
    await expect(page.getByText('No nutrition log today').first()).toBeVisible()
    await expect(page.getByText('Client compliance')).toBeVisible()
  })

  test('needs attention filter narrows roster', async ({ coachPage: page }) => {
    await page.goto('/compliance')
    await page.getByRole('button', { name: 'Needs attention' }).click()
    await expect(page).toHaveURL(/filter=needs_attention/)
  })

  test('nutrition issue links to client nutrition tab', async ({
    coachPage: page,
  }) => {
    await page.goto('/compliance?filter=needs_attention')
    const nutritionIssue = page
      .getByRole('link', { name: 'No nutrition log today' })
      .first()
    const visible = await nutritionIssue.isVisible().catch(() => false)
    if (!visible) {
      test.skip(true, 'No nutrition compliance issue for E2E client today')
    }
    await nutritionIssue.click()
    await expect(page).toHaveURL(
      new RegExp(`/clients/${E2E_CLIENT_ID}\\?tab=nutrition`)
    )
  })

  test('can find seeded client by name', async ({ coachPage: page }) => {
    await page.goto('/compliance')
    await expect(page.getByRole('link', { name: E2E_CLIENT_NAME }).first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
