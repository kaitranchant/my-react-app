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

function futureTargetDate(daysAhead = 90) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

async function coachGoalsPage(page: import('@playwright/test').Page) {
  await page.goto(`/clients/${E2E_CLIENT_ID}?tab=progress&section=goals`)
  await expect(
    page.getByRole('button', { name: 'Add daily target' })
  ).toBeVisible()
}

async function fillTargetDate(page: import('@playwright/test').Page) {
  await page.locator('#goal-target-date').fill(futureTargetDate())
}

async function selectTrackableGoalType(
  page: import('@playwright/test').Page,
  label: string
) {
  await page.getByLabel('Goal type').click()
  await page.getByRole('option', { name: label }).click()
}

test.describe('Client goals', () => {
  test('coach can set goals and client sees them in the portal', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await coachGoalsPage(page)

    await page.getByRole('button', { name: 'Steps' }).click()
    await page.getByRole('button', { name: 'Add daily target' }).click()
    await page.getByRole('button', { name: 'Save goal' }).click()
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
    const goal = page
      .getByText(/Steps: at least 10,?000 steps/i)
      .filter({ visible: true })
      .first()
    await goal.scrollIntoViewIfNeeded()
    await expect(goal).toBeVisible({ timeout: 10_000 })
  })

  test('coach can add a performance goal', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await coachGoalsPage(page)
    await page.getByRole('button', { name: 'Add goal' }).click()
    await selectTrackableGoalType(page, 'Performance')
    await page.getByRole('combobox', { name: 'Exercise' }).click()
    await page.getByRole('option').first().click()
    await fillTargetDate(page)
    await page.getByRole('button', { name: 'Save goal' }).click()

    await expect(page.getByText('Goal added')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Performance goal:/i).first()).toBeVisible()
  })

  test('coach can add a habit goal', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await coachGoalsPage(page)
    await page.getByRole('button', { name: 'Add goal' }).click()
    await selectTrackableGoalType(page, 'Habit')
    await fillTargetDate(page)
    await page.getByRole('button', { name: 'Save goal' }).click()

    await expect(page.getByText('Goal added')).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByText(/Train at least 4 times per week/i).first()
    ).toBeVisible()
  })

  test('coach can add a milestone goal', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await coachGoalsPage(page)
    await page.getByRole('button', { name: 'Add goal' }).click()
    await selectTrackableGoalType(page, 'Milestone')
    await fillTargetDate(page)
    await page.getByRole('button', { name: 'Save goal' }).click()

    await expect(page.getByText('Goal added')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Complete 20 sessions/i).first()).toBeVisible()
  })
})
