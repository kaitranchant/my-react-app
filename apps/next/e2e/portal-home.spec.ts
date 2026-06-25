import {
  test,
  expect,
  E2E_WORKOUT_NAME,
  dismissPortalWelcomeDialog,
} from './fixtures'

test.describe('Portal home', () => {
  test('home shows greeting, workout hero, and stats row', async ({
    clientPage: page,
  }) => {
    await expect(
      page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })
    ).toBeVisible({ timeout: 15_000 })
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
    await page.goto('/portal')
    await dismissPortalWelcomeDialog(page)
    await expect(
      page.getByRole('link', { name: 'Log nutrition', exact: true })
    ).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('Portal home — mobile nav', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('more menu reaches check-in and nutrition', async ({ clientPage: page }) => {
    await page.getByRole('button', { name: 'More navigation' }).click()
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Check-in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Nutrition' })).toBeVisible()
    await page.getByRole('link', { name: 'Nutrition' }).click()
    await expect(page).toHaveURL(/\/portal\/nutrition/)
  })

  test('more tab shows badge when check-in is due', async ({ clientPage: page }) => {
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

    await expect(moreButton.locator('.bg-brand')).toBeVisible()
    await moreButton.click()
    await expect(
      page.getByRole('link', { name: 'Check-in' }).locator('.bg-brand')
    ).toBeVisible()
  })
})
