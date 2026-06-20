import {
  test,
  expect,
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_PASSWORD,
  E2E_CLIENT_ID,
  E2E_COACH_EMAIL,
  E2E_COACH_PASSWORD,
  hasE2ECredentials,
  signOutFromApp,
} from './fixtures'

test.describe('Client goals', () => {
  test('coach can set goals and client sees them in the portal', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(
      `/clients/${E2E_CLIENT_ID}?tab=progress&section=goals`
    )
    await expect(
      page.getByRole('button', { name: 'Add daily target' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Steps' }).click()
    await page.getByRole('button', { name: 'Add daily target' }).click()
    await expect(page.getByText('Goal added')).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByText(/Steps: at least 10,?000 steps/i).first()
    ).toBeVisible()

    await signOutFromApp(page, 'E2E Coach')

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/goals')
    await expect(
      page.getByRole('heading', { name: 'Goals', exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(/Steps: at least 10,?000 steps/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })
})
