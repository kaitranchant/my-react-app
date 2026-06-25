import { test, expect } from './fixtures'

test.describe('Mobile smoke — client portal', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('client portal home loads on mobile', async ({ clientPage: page }) => {
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible()
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Home', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Workouts', exact: true })
    ).toBeVisible()
  })

  test('client can open more menu and reach form review', async ({
    clientPage: page,
  }) => {
    await page.getByRole('button', { name: 'More navigation' }).click()
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
    await page.getByRole('link', { name: 'Form Review' }).click()
    await expect(page).toHaveURL(/\/portal\/form-review/)
  })

  test('client nutrition page loads on mobile', async ({ clientPage: page }) => {
    await page.goto('/portal/nutrition')
    await expect(page.getByText('Macro targets').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Food diary').first()).toBeVisible()
  })
})

test.describe('Mobile smoke — coach dashboard', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('coach can use bottom nav to reach clients', async ({ coachPage: page }) => {
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL(/\/clients/)
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })
})
