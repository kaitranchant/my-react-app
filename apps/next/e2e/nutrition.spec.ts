import {
  test,
  expect,
  E2E_CLIENT_NAME,
  E2E_CLIENT_EMAIL,
  E2E_CLIENT_PASSWORD,
  E2E_CLIENT_ID,
  E2E_COACH_EMAIL,
  E2E_COACH_PASSWORD,
  E2E_MEAL_PLAN_NAME,
  E2E_MEAL_PLAN_MEAL_NAME,
  E2E_FOOD_SEARCH_QUERY,
  hasE2ECredentials,
  signOutFromApp,
} from './fixtures'

async function coachNutritionTrackingPage(page: import('@playwright/test').Page) {
  await page.goto(`/clients/${E2E_CLIENT_ID}?tab=nutrition`)
  await expect(page.getByRole('tab', { name: 'Tracking' })).toBeVisible()
  await expect(page.getByText('Food diary').first()).toBeVisible({
    timeout: 10_000,
  })
}

async function coachNutritionSetupPage(page: import('@playwright/test').Page) {
  await page.goto(`/clients/${E2E_CLIENT_ID}?tab=nutrition&section=setup`)
  await expect(page.getByRole('tab', { name: 'Setup' })).toBeVisible()
  await expect(page.getByText('Macro targets').first()).toBeVisible({
    timeout: 10_000,
  })
}

function dateKeyDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function mealPlanCard(page: import('@playwright/test').Page) {
  return page.locator('[data-slot="card"]').filter({ hasText: 'Meal plan' })
}

async function assignMealPlanWithStartDate(
  page: import('@playwright/test').Page,
  startDateKey: string
) {
  const changePlan = page.getByRole('button', { name: 'Change plan' })
  if (await changePlan.isVisible()) {
    await changePlan.click()
  } else {
    await page.getByRole('button', { name: 'Assign meal plan' }).click()
  }

  await page.getByRole('combobox', { name: 'Meal plan' }).click()
  await page.getByRole('option', { name: E2E_MEAL_PLAN_NAME }).click()
  await page.getByLabel('Start date').fill(startDateKey)
  await page.getByRole('button', { name: 'Assign plan' }).click()
  await expect(page.getByText('Meal plan assigned.')).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByRole('dialog', { name: 'Assign meal plan' })).toBeHidden(
    { timeout: 10_000 }
  )
}

test.describe('Nutrition', () => {
  test('portal home shows nutrition prompt when targets set and no log today', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await coachNutritionSetupPage(page)
    await page.getByLabel('Calories (kcal)').fill('2100')
    await page.getByLabel('Protein (g)').fill('150')
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

    await page.goto('/portal')
    await expect(page.getByRole('link', { name: 'Log nutrition' })).toBeVisible({
      timeout: 10_000,
    })
  })

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

    await coachNutritionSetupPage(page)
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

    await page.getByRole('button', { name: 'Adherence 5 of 5' }).click()
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

    await coachNutritionTrackingPage(page)
    await expect(page.getByText('5/5')).toBeVisible({ timeout: 10_000 })
  })

  test('coach saves dietary restrictions and client sees them', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await coachNutritionSetupPage(page)
    await page.getByRole('button', { name: 'Gluten-free' }).click()
    await page.getByRole('button', { name: 'Save dietary info' }).click()
    await expect(page.getByText('Dietary info saved.')).toBeVisible({
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
    await expect(page.getByText('Gluten-free')).toBeVisible({ timeout: 10_000 })
  })

  test('client logs manual food diary entry', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/nutrition')
    await page.getByRole('button', { name: 'Add food' }).click()
    await page
      .getByRole('button', { name: 'Enter food manually instead' })
      .click()
    await page.getByLabel('Food').fill('E2E test oatmeal')
    await page.getByRole('button', { name: 'Log food' }).click()
    await expect(page.getByText('E2E test oatmeal')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('client logs USDA food from catalog search', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/nutrition')
    await page.getByRole('button', { name: 'Add food' }).click()
    await page.getByLabel('Search foods').fill(E2E_FOOD_SEARCH_QUERY)

    await expect(
      page.getByRole('option').first().or(page.getByRole('alert'))
    ).toBeVisible({ timeout: 15_000 })

    if (await page.getByRole('alert').isVisible()) {
      test.skip(true, 'Food catalog not configured in this environment')
    }

    await page.getByRole('option').first().click()
    await page.getByRole('button', { name: 'Log food' }).click()
    await expect(
      page.locator('li').filter({ hasText: new RegExp(E2E_FOOD_SEARCH_QUERY, 'i') }).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('portal adherence form syncs with food diary date', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/nutrition')
    await page.getByRole('button', { name: 'Previous day' }).click()
    await expect(page.getByRole('heading', { name: /Adherence for/i })).toBeVisible({
      timeout: 10_000,
    })
    await page.getByRole('button', { name: 'Adherence 3 of 5' }).click()
    await page.getByRole('button', { name: /Save log|Update log/ }).click()
    await expect(page.getByText('Nutrition log saved.')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('coach assigns meal plan and client sees today meals', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(90_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(`/clients/${E2E_CLIENT_ID}?tab=nutrition&section=setup`)
    await expect(page.getByText('Meal plan', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Assign meal plan' }).click()
    await page.getByRole('combobox', { name: 'Meal plan' }).click()
    await page.getByRole('option', { name: E2E_MEAL_PLAN_NAME }).click()
    await page.getByRole('button', { name: 'Assign plan' }).click()
    await expect(page.getByText('Meal plan assigned.')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('dialog', { name: 'Assign meal plan' })).toBeHidden({
      timeout: 10_000,
    })
    await expect(
      page
        .locator('[data-slot="card"]')
        .filter({ hasText: 'Meal plan' })
        .getByText(E2E_MEAL_PLAN_NAME)
    ).toBeVisible()

    await signOutFromApp(page, 'E2E Coach')

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/nutrition')
    await expect(page.getByText("Today's meals")).toBeVisible()
    await expect(page.getByText(E2E_MEAL_PLAN_MEAL_NAME)).toBeVisible({
      timeout: 10_000,
    })
  })

  test('coach logs food on behalf of client', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    const foodName = 'E2E coach logged banana'

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto(`/clients/${E2E_CLIENT_ID}?tab=nutrition`)
    await expect(page.getByRole('tab', { name: 'Tracking' })).toBeVisible()
    await page.getByRole('button', { name: 'Add food' }).click()
    await page
      .getByRole('button', { name: 'Enter food manually instead' })
      .click()
    await page.getByLabel('Food').fill(foodName)
    await page.getByRole('button', { name: 'Log food' }).click()
    await expect(page.getByText('Food logged.')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(foodName)).toBeVisible()

    await signOutFromApp(page, 'E2E Coach')

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/nutrition')
    await expect(page.getByText(foodName)).toBeVisible({ timeout: 10_000 })
  })

  test('coach logs adherence on behalf of client', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(60_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await coachNutritionTrackingPage(page)
    await expect(
      page.getByRole('heading', { name: /Log adherence for/i })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Adherence 4 of 5' }).click()
    await page.getByLabel('Fiber (g)').fill('28')
    await page.getByLabel('Water (ml)').fill('2500')
    await page.getByRole('button', { name: /Save log|Update log/ }).click()
    await expect(page.getByText('Adherence log saved.')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('4/5')).toBeVisible()
  })

  test('coach builds meal plan in library with day and meal', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(90_000)

    const planName = `E2E builder plan ${Date.now()}`

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/library/meal-plans')
    await page.getByRole('button', { name: 'New meal plan' }).click()
    await page.getByLabel('Name').fill(planName)
    await page.getByRole('button', { name: 'Create meal plan' }).click()
    await expect(page).toHaveURL(/\/library\/meal-plans\//, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: planName })).toBeVisible()

    await page.getByRole('button', { name: 'Add day' }).click()
    await expect(page.getByText('Day added.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('1 day in this plan')).toBeVisible()

    await page.getByPlaceholder('e.g. Greek yogurt bowl').fill('E2E builder breakfast')
    await page.getByRole('button', { name: 'Add meal' }).click()
    await expect(page.getByText('Meal added.')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('E2E builder breakfast')).toBeVisible()
  })

  test('coach extends meal plan when client reaches end of cycle', async ({
    page,
  }) => {
    test.skip(!hasE2ECredentials, 'Supabase env vars required for E2E tests')
    test.setTimeout(90_000)

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_COACH_EMAIL)
    await page.getByLabel('Password').fill(E2E_COACH_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await coachNutritionSetupPage(page)
    await assignMealPlanWithStartDate(page, dateKeyDaysAgo(0))

    const dayCountText = await mealPlanCard(page)
      .getByText(/\d+-day/)
      .textContent()
    const dayCount = Number(dayCountText?.match(/(\d+)-day/)?.[1] ?? 1)

    await assignMealPlanWithStartDate(page, dateKeyDaysAgo(dayCount))

    const card = mealPlanCard(page)
    await expect(card.getByText(/reached the end of the plan/i)).toBeVisible({
      timeout: 10_000,
    })
    await card.getByRole('button', { name: 'Extend plan' }).click()
    await expect(
      page.getByText('Meal plan extended with another cycle.')
    ).toBeVisible({ timeout: 10_000 })
    await expect(card.getByText(/reached the end of the plan/i)).toBeHidden({
      timeout: 10_000,
    })
    await expect(card.getByText(`${dayCount * 2}-day`)).toBeVisible()
    await expect(card.getByText(E2E_MEAL_PLAN_MEAL_NAME)).toBeVisible()

    await signOutFromApp(page, 'E2E Coach')

    await page.goto('/login')
    await page.getByLabel('Email').fill(E2E_CLIENT_EMAIL)
    await page.getByLabel('Password').fill(E2E_CLIENT_PASSWORD)
    await Promise.all([
      page.waitForURL(/\/portal/, { timeout: 20_000 }),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ])

    await page.goto('/portal/nutrition')
    await expect(page.getByText("Today's meals")).toBeVisible()
    await expect(page.getByText(E2E_MEAL_PLAN_MEAL_NAME)).toBeVisible({
      timeout: 10_000,
    })
    await expect(
      page.getByText(/reached the end of your current meal plan/i)
    ).toBeHidden()
  })
})
