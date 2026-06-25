import { test as base, expect, type Page } from '@playwright/test'

export const E2E_COACH_EMAIL =
  process.env.E2E_COACH_EMAIL ?? 'e2e-coach@coaching-app.test'
export const E2E_COACH_PASSWORD =
  process.env.E2E_COACH_PASSWORD ?? 'TestPassword123!'
export const E2E_GYM_COACH_EMAIL =
  process.env.E2E_GYM_COACH_EMAIL ?? 'e2e-gym-coach@coaching-app.test'
export const E2E_GYM_COACH_PASSWORD =
  process.env.E2E_GYM_COACH_PASSWORD ?? 'TestPassword123!'
export const E2E_CLIENT_EMAIL =
  process.env.E2E_CLIENT_EMAIL ?? 'e2e-client@coaching-app.test'
export const E2E_CLIENT_PASSWORD =
  process.env.E2E_CLIENT_PASSWORD ?? 'TestPassword123!'
export const E2E_CLIENT_NAME = 'E2E Test Client'
export const E2E_PROGRAM_NAME = 'E2E Test Program'
export const E2E_WORKOUT_NAME = 'E2E Day 1 Workout'
export const E2E_MEAL_PLAN_NAME = 'E2E Test Meal Plan'
export const E2E_MEAL_PLAN_MEAL_NAME = 'E2E Test Breakfast'
export const E2E_CLIENT_ID =
  process.env.E2E_CLIENT_ID ?? 'cebb411a-1fa1-4939-ab5e-8d516d874df2'

export const hasE2ECredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function login(
  page: Page,
  email: string,
  password: string,
  expectedPath: RegExp
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await Promise.all([
    page.waitForURL(expectedPath, { timeout: 20_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ])
}

export async function expandSidebarGroup(page: Page, groupLabel: string) {
  const group = page.getByRole('button', { name: groupLabel, exact: true })
  if ((await group.getAttribute('aria-expanded')) !== 'true') {
    await group.click()
  }
}

export async function expectSidebarLink(
  page: Page,
  groupLabel: string,
  linkLabel: string
) {
  await expandSidebarGroup(page, groupLabel)
  await expect(
    page.getByRole('link', { name: linkLabel, exact: true })
  ).toBeVisible()
}

export function teamIdFromUrl(url: string) {
  return url.match(/\/teams\/([^/?#]+)/)?.[1] ?? null
}

export { login }

export async function signOutFromApp(page: Page, userName: string) {
  await page
    .locator('[data-slot="dropdown-menu-trigger"]')
    .filter({ hasText: userName })
    .click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
}

export function selectedDayWorkoutSummary(page: Page) {
  return page.getByText(new RegExp(`${E2E_WORKOUT_NAME} ·`))
}

function todayDateKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function openPortalWorkoutForLogging(page: Page) {
  const today = todayDateKey()
  await page.goto(`/portal/workouts?date=${today}`)
  await expect(
    page.getByRole('button', { name: new RegExp(E2E_WORKOUT_NAME) }).first()
  ).toBeVisible({ timeout: 15_000 })
}

type E2EFixtures = {
  coachPage: Page
  clientPage: Page
}

export const test = base.extend<E2EFixtures>({
  coachPage: async ({ page }, use) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    await login(page, E2E_COACH_EMAIL, E2E_COACH_PASSWORD, /\/dashboard/)
    await use(page)
  },
  clientPage: async ({ page }, use) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    await login(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD, /\/portal/)
    await use(page)
  },
})

export { expect }
