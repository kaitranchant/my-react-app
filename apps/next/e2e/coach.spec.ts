import {
  test,
  expect,
  E2E_CLIENT_NAME,
  expectSidebarLink,
} from './fixtures'

test.describe('Coach auth and client management', () => {
  test('coach can sign in and add a client', async ({ coachPage: page }) => {
    test.setTimeout(60_000)
    await page.setViewportSize({ width: 1280, height: 1200 })
    await page.goto('/clients')
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()

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
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 15_000 })
  })

  test('coach dashboard loads with navigation', async ({ coachPage: page }) => {
    await expectSidebarLink(page, 'Athletes', 'Clients')
    await expectSidebarLink(page, 'Programming', 'Library')
  })
})

test.describe('Seeded client visibility', () => {
  test('coach can find seeded E2E client', async ({ coachPage: page }) => {
    await page.goto('/clients')
    await expect(page.getByText(E2E_CLIENT_NAME)).toBeVisible({ timeout: 15_000 })
  })
})
