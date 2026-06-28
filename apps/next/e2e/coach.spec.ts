import {
  test,
  expect,
  E2E_CLIENT_NAME,
  clientRosterLink,
  expectSidebarLink,
} from './fixtures'

test.describe('Coach auth and client management', () => {
  test('coach can sign in and add a client', async ({ coachPage: page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1280, height: 1200 })
    await page.goto('/clients')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

    const dialog = page.getByRole('dialog', { name: 'Add client' })
    await page.getByRole('button', { name: 'Add client' }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('tab', { name: 'Add manually' }).click()

    const uniqueName = `E2E Client ${Date.now()}`
    await dialog.getByLabel('Full name').fill(uniqueName)
    await dialog.getByLabel('Email').fill(`e2e-${Date.now()}@coaching-app.test`)

    const submit = dialog.getByRole('button', { name: 'Add client', exact: true })
    await submit.scrollIntoViewIfNeeded()
    await submit.click()

    await expect(page.getByText('Client added')).toBeVisible({ timeout: 15_000 })
    await expect(dialog).toBeHidden({ timeout: 15_000 })
    await page.getByPlaceholder('Search clients…').fill(uniqueName)
    await expect(clientRosterLink(page, uniqueName)).toBeVisible({
      timeout: 15_000,
    })
  })

  test('coach dashboard loads with navigation', async ({ coachPage: page }) => {
    await expectSidebarLink(page, 'Clients', 'Users')
    await expectSidebarLink(page, 'Programming', 'Library')
  })
})

test.describe('Seeded client visibility', () => {
  test('coach can find seeded E2E client', async ({ coachPage: page }) => {
    test.setTimeout(60_000)
    await page.goto('/clients')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

    const clearFilters = page.getByRole('button', { name: 'Clear filters' })
    if (await clearFilters.isVisible().catch(() => false)) {
      await clearFilters.click()
    }

    await page.getByPlaceholder('Search clients…').fill(E2E_CLIENT_NAME)
    await expect(
      page
        .getByRole('link', { name: E2E_CLIENT_NAME, exact: true })
        .filter({ visible: true })
    ).toBeVisible({ timeout: 30_000 })
  })

  test('global search finds seeded client', async ({ coachPage: page }) => {
    await page.goto('/dashboard')
    await page
      .getByRole('button', { name: /Search clients/i })
      .first()
      .click()
    const searchInput = page.getByPlaceholder(/Search clients/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill(E2E_CLIENT_NAME)
    await expect(
      page.getByRole('option').filter({ hasText: E2E_CLIENT_NAME })
    ).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp('/clients/'))
    await expect(page.getByText(E2E_CLIENT_NAME).first()).toBeVisible()
  })
})
