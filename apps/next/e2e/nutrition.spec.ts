import {
  test,
  expect,
  E2E_CLIENT_NAME,
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_PASSWORD,
  E2E_CLIENT_ID,
  E2E_COACH_EMAIL,
  E2E_COACH_PASSWORD,
  hasE2ECredentials,
  signOutFromApp,
} from './fixtures'

async function coachNutritionPage(page: import('@playwright/test').Page) {
  await page.goto(`/clients/${E2E_CLIENT_ID}?tab=nutrition`)
  await expect(page.getByRole('heading', { name: 'Macro targets' })).toBeVisible()
}

test.describe('Nutrition', () => {
  test('coach sets macro targets and client logs daily adherence', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await coachNutritionPage(page)
    await page.getByLabel('Calories (kcal)').fill('2200')
    await page.getByLabel('Protein (g)').fill('160')
    await page.getByRole('button', { name: 'Save targets' }).click()
    await expect(page.getByText('Nutrition targets saved.')).toBeVisible({
      timeout: 10_000,
    })

    await signOutFromApp(page, 'E2E Coach')

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/nutrition')
    await expect(page.getByRole('heading', { name: 'Nutrition' })).toBeVisible()
    await expect(page.getByText('2200 kcal')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('160 g')).toBeVisible()

    await page.getByRole('button', { name: '5' }).click()
    await page.getByRole('button', { name: 'Log today' }).click()
    await expect(page.getByText('Nutrition log saved.')).toBeVisible({
      timeout: 10_000,
    })

    await signOutFromApp(page, E2E_CLIENT_NAME)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await coachNutritionPage(page)
    await expect(page.getByText('5/5')).toBeVisible({ timeout: 10_000 })
  })
})
