import { test, expect, E2E_CLIENT_NAME } from './fixtures'

test.describe('Teams', () => {
  test('coach can create a team and add a member', async ({ coachPage: page }) => {
    const teamName = `E2E Team ${Date.now()}`

    await page.goto('/teams')
    await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible()

    await page.getByRole('button', { name: 'Create team' }).click()
    await page.getByLabel('Name').fill(teamName)
    await page.getByRole('button', { name: 'Create team', exact: true }).click()

    await expect(page).toHaveURL(/\/teams\//, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: teamName })).toBeVisible()

    await page.getByRole('tab', { name: 'Members' }).click()
    await page.getByRole('button', { name: 'Add member' }).click()

    await page.getByLabel('Client').click()
    await page.getByRole('option', { name: E2E_CLIENT_NAME }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add member', exact: true })
      .click()

    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })
    await expect(
      page.getByRole('main').getByText(E2E_CLIENT_NAME, { exact: true })
    ).toBeVisible({ timeout: 15_000 })
  })
})
