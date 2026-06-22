import { test, expect } from './fixtures'

test.describe('Mobile smoke — client portal', () => {
  test('client portal home loads on mobile', async ({ clientPage: page }) => {
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible()
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Workouts' })).toBeVisible()
  })

  test('client can open mobile menu and reach form review', async ({
    clientPage: page,
  }) => {
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible()
    await page.getByRole('link', { name: 'Form Review' }).click()
    await expect(page).toHaveURL(/\/portal\/form-review/)
  })
})

test.describe('Mobile smoke — coach dashboard', () => {
  test('coach can open mobile nav and reach clients', async ({ coachPage: page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('dialog', { name: 'Navigation menu' })).toBeVisible()
    await page.getByRole('link', { name: 'Clients' }).click()
    await expect(page).toHaveURL(/\/clients/)
    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible()
  })
})
