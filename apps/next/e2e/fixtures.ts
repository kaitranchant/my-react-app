import { test as base, expect, type Page } from '@playwright/test'

export const E2E_COACH_EMAIL =
  process.env.E2E_COACH_EMAIL ?? 'e2e-coach@coaching-app.test'
export const E2E_COACH_PASSWORD =
  process.env.E2E_COACH_PASSWORD ?? 'TestPassword123!'
export const E2E_CLIENT_EMAIL =
  process.env.E2E_CLIENT_EMAIL ?? 'e2e-client@coaching-app.test'
export const E2E_CLIENT_PASSWORD =
  process.env.E2E_CLIENT_PASSWORD ?? 'TestPassword123!'
export const E2E_CLIENT_NAME = 'E2E Test Client'
export const E2E_PROGRAM_NAME = 'E2E Test Program'
export const E2E_WORKOUT_NAME = 'E2E Day 1 Workout'

export const hasE2ECredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

export function selectedDayWorkoutSummary(page: Page) {
  return page.getByText(new RegExp(`${E2E_WORKOUT_NAME} ·`))
}

type E2EFixtures = {
  coachPage: Page
  clientPage: Page
}

export const test = base.extend<E2EFixtures>({
  coachPage: async ({ page }, use) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    await login(page, E2E_COACH_EMAIL, E2E_COACH_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/)
    await use(page)
  },
  clientPage: async ({ page }, use) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    await login(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD)
    await expect(page).toHaveURL(/\/portal/)
    await use(page)
  },
})

export { expect }
