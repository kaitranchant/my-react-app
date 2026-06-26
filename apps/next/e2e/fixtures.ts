import path from 'node:path'

import { test as base, expect, type Browser, type Page } from '@playwright/test'

const authDir = path.join(__dirname, '.auth')
export const coachAuthFile = path.join(authDir, 'coach.json')
export const clientAuthFile = path.join(authDir, 'client.json')

const LOGIN_TIMEOUT_MS = 30_000

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
export const E2E_FOOD_SEARCH_QUERY = 'yogurt'
export const E2E_CLIENT_ID =
  process.env.E2E_CLIENT_ID ?? 'cebb411a-1fa1-4939-ab5e-8d516d874df2'

export const hasE2ECredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function loginOnce(
  page: Page,
  email: string,
  password: string,
  expectedPath: RegExp
) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await Promise.all([
    page.waitForURL(expectedPath, { timeout: LOGIN_TIMEOUT_MS }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ])
}

async function login(
  page: Page,
  email: string,
  password: string,
  expectedPath: RegExp
) {
  try {
    await loginOnce(page, email, password, expectedPath)
  } catch {
    await loginOnce(page, email, password, expectedPath)
  }
}

async function pageFromStorageState(browser: Browser, storageState: string) {
  const context = await browser.newContext({ storageState })
  const page = await context.newPage()
  return { context, page }
}

async function ensureCoachSession(page: Page) {
  await page.goto('/dashboard')
  if (page.url().includes('/login')) {
    await login(page, E2E_COACH_EMAIL, E2E_COACH_PASSWORD, /\/dashboard/)
    return
  }
  await page.waitForURL(/\/dashboard/, { timeout: LOGIN_TIMEOUT_MS })
}

async function ensureClientSession(page: Page) {
  await page.goto('/portal')
  if (page.url().includes('/login')) {
    await login(page, E2E_CLIENT_EMAIL, E2E_CLIENT_PASSWORD, /\/portal/)
  } else {
    await page.waitForURL(/\/portal/, { timeout: LOGIN_TIMEOUT_MS })
  }
  await dismissPortalWelcomeDialog(page)
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

/** Desktop clients roster link (avoids hidden mobile card duplicates). */
export function clientRosterLink(page: Page, name: string) {
  return page.locator('table').getByRole('link', { name, exact: true })
}

export { login }

export async function dismissPortalWelcomeDialog(page: Page) {
  const welcome = page.getByRole('dialog', { name: 'Welcome to your program' })
  const appeared = await welcome
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false)

  if (!appeared) return

  await page.getByRole('button', { name: 'Explore on my own' }).click()
  await expect(welcome).toBeHidden({ timeout: 10_000 })
}

/** Open the portal overflow ("More") sheet on mobile layouts. */
export async function openPortalMoreMenu(page: Page) {
  await dismissPortalWelcomeDialog(page)
  const moreButton = page.getByRole('button', { name: 'More navigation' })
  await moreButton.scrollIntoViewIfNeeded()
  await expect(moreButton).toBeVisible({ timeout: 15_000 })
  await moreButton.click()
  const dialog = page.getByRole('dialog', { name: 'More' })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  return dialog
}
/** Dismiss welcome overlay and wait for portal home hero content. */
export async function preparePortalHome(page: Page) {
  if (!page.url().includes('/portal')) {
    await page.goto('/portal')
  }

  await dismissPortalWelcomeDialog(page)

  await expect(
    page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
  ).toBeVisible({ timeout: 30_000 })
}

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

export { todayDateKey }

export async function openPortalWorkoutForLogging(page: Page) {
  const today = todayDateKey()
  await page.goto(`/portal/workouts?date=${today}`)
  await expect(
    page.getByRole('button', {
      name: /Log workout|Continue log|View log|Resume workout/i,
    }).or(
      page.getByRole('link', {
        name: /Start workout|Continue workout|Resume workout/i,
      })
    )
  ).toBeVisible({ timeout: 15_000 })
}

export async function openPortalImmersiveWorkoutLog(page: Page) {
  const today = todayDateKey()
  await page.goto(`/portal/workouts?date=${today}`)
  const link = page
    .getByRole('link', {
      name: /Start workout|Continue workout|Resume workout/i,
    })
    .first()
  await expect(link).toBeVisible({ timeout: 15_000 })
  await link.click()
  await expect(page).toHaveURL(/\/portal\/workouts\/[^/]+\/log/, {
    timeout: 15_000,
  })
}

export async function clickWorkoutLogButton(page: Page) {
  await page
    .getByRole('button', {
      name: /Log workout|Continue log|View log|Resume workout/i,
    })
    .click()
}

type E2EFixtures = {
  coachPage: Page
  clientPage: Page
}

export const test = base.extend<E2EFixtures>({
  coachPage: [
    async ({ browser }, use) => {
      test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
      const { context, page } = await pageFromStorageState(browser, coachAuthFile)
      try {
        await ensureCoachSession(page)
        await use(page)
      } finally {
        await context.close()
      }
    },
    { timeout: 90_000 },
  ],
  clientPage: [
    async ({ browser }, use) => {
      test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
      const { context, page } = await pageFromStorageState(browser, clientAuthFile)
      try {
        await ensureClientSession(page)
        await use(page)
      } finally {
        await context.close()
      }
    },
    { timeout: 90_000 },
  ],
})

export { expect }
