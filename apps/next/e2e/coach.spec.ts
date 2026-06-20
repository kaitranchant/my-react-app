import { test, expect, E2E_CLIENT_NAME } from './fixtures'

test.describe('Coach auth and client management', () => {
  test('coach can sign in and add a client', async ({ coachPage: page }) => {
    await page.goto('/clients')
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()

    await page.getByRole('button', { name: 'Add client' }).click()
    await page.getByRole('tab', { name: 'Add manually' }).click()

    const uniqueName = `E2E Client ${Date.now()}`
    await page.getByLabel('Full name').fill(uniqueName)
    await page.getByLabel('Email').fill(`e2e-${Date.now()}@coaching-app.test`)

    await page.getByRole('dialog').locator('form').evaluate((form) => {
      form.requestSubmit()
    })

    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 15_000 })
  })

  test('coach dashboard loads with navigation', async ({ coachPage: page }) => {
    await expect(
      page.getByRole('link', { name: 'Clients', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Library', exact: true })
    ).toBeVisible()
  })
})

test.describe('Seeded client visibility', () => {
  test('coach can find seeded E2E client', async ({ coachPage: page }) => {
    await page.goto('/clients')
    await expect(page.getByText(E2E_CLIENT_NAME)).toBeVisible({ timeout: 15_000 })
  })
})
