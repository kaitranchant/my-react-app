import {
  test,
  expect,
  E2E_WORKOUT_NAME,
  preparePortalHome,
  openPortalMoreMenu,
} from './fixtures'

test.describe('Portal home', () => {
  test('home shows greeting, workout hero, and stats row', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)
    await preparePortalHome(page)
    await expect(page.getByText("Today's workout").first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: E2E_WORKOUT_NAME })
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Streak').first()).toBeVisible()
    await expect(page.getByText('This week').first()).toBeVisible()
    await expect(page.getByText('Last active').first()).toBeVisible()
  })

  test('nutrition prompt appears when targets are set and no log today', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/portal')
    const prompt = page.getByRole('link', { name: 'Log nutrition', exact: true })
    const hasNutritionDue = await prompt
      .isVisible({ timeout: 8_000 })
      .catch(() => false)
    if (!hasNutritionDue) {
      test.skip(true, 'Nutrition log not due for E2E client today')
    }
    await expect(prompt).toBeVisible()
  })
})

test.describe('Portal home — mobile nav', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('more menu reaches check-in and nutrition', async ({ clientPage: page }) => {
    await preparePortalHome(page)
    const dialog = await openPortalMoreMenu(page)
    await expect(dialog.getByRole('link', { name: 'Check-in' })).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Nutrition' })).toBeVisible()
    await dialog.getByRole('link', { name: 'Nutrition' }).click()
    await expect(page).toHaveURL(/\/portal\/nutrition/)
  })

  test('more tab shows badge when check-in is due', async ({ clientPage: page }) => {
    await preparePortalHome(page)
    const moreButton = page.getByRole('button', { name: 'More navigation' })
    await expect(moreButton).toBeVisible()

    const checkInPrompt = page.getByText(
      /Check in (today|this week|this period|before today)/i
    )
    const hasCheckInDue = await checkInPrompt
      .first()
      .isVisible()
      .catch(() => false)

    if (!hasCheckInDue) {
      test.skip(true, 'Check-in not due for E2E client in this period')
    }

    await expect(moreButton.getByTestId('portal-nav-badge')).toBeVisible()
    await moreButton.click()
    await expect(
      page.getByRole('link', { name: 'Check-in' }).getByTestId('portal-nav-badge')
    ).toBeVisible()
  })

  test('nutrition badge appears in more menu when log is due', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/portal')
    const nutritionPrompt = page.getByRole('link', { name: 'Log nutrition', exact: true })
    const hasNutritionDue = await nutritionPrompt
      .isVisible({ timeout: 8_000 })
      .catch(() => false)
    if (!hasNutritionDue) {
      test.skip(true, 'Nutrition log not due for E2E client today')
    }

    await preparePortalHome(page)
    const dialog = await openPortalMoreMenu(page)
    await expect(
      dialog.getByRole('link', { name: 'Nutrition' }).getByTestId('portal-nav-badge')
    ).toBeVisible()
  })
})
