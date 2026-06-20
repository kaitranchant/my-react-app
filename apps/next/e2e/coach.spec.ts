import { test, expect, E2E_CLIENT_NAME } from './fixtures'

test.describe('Coach auth and client management', () => {
  test('coach can sign in and add a client', async ({ coachPage: page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1280, height: 1200 })
    await page.goto('/clients')
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()

    await page.getByRole('button', { name: 'Add client' }).click()
    await page.getByRole('tab', { name: 'Add manually' }).click()

    const panel = page.getByRole('tabpanel', { name: 'Add manually' })
    const uniqueName = `E2E Client ${Date.now()}`
    await panel.getByLabel('Full name').fill(uniqueName)
    await panel.getByLabel('Email').fill(`e2e-${Date.now()}@coaching-app.test`)

    await panel.getByRole('button', { name: 'Add client' }).click()

    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })
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
