import { test, expect } from './fixtures'

test.describe('Mobile smoke — client portal', () => {
  test('client portal home loads on mobile', async ({ clientPage: page }) => {
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible()
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Workouts' })).toBeVisible()
  })

  test('client can open more menu and reach form review', async ({
    clientPage: page,
  }) => {
    await page.getByRole('button', { name: 'More navigation' }).click()
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
    await page.getByRole('link', { name: 'Form Review' }).click()
    await expect(page).toHaveURL(/\/portal\/form-review/)
  })
})

test.describe('Mobile smoke — coach dashboard', () => {
  test('coach can use bottom nav to reach clients', async ({ coachPage: page }) => {
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL(/\/clients/)
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })
})
