import { test, expect, preparePortalHome, openPortalMoreMenu, openPortalImmersiveWorkoutLog } from './fixtures'

test.describe('Mobile smoke — client portal', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('client portal home loads on mobile', async ({ clientPage: page }) => {
    test.setTimeout(60_000)
    await preparePortalHome(page)
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Dashboard', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Workouts', exact: true })
    ).toBeVisible()
  })

  test('client can open more menu and reach form review', async ({
    clientPage: page,
  }) => {
    await preparePortalHome(page)
    const dialog = await openPortalMoreMenu(page)
    await dialog.getByRole('link', { name: 'Form Review' }).click()
    await expect(page).toHaveURL(/\/portal\/form-review/)
  })

  test('client nutrition page loads on mobile', async ({ clientPage: page }) => {
    await page.goto('/portal/nutrition')
    await expect(page.getByText('Macro targets').first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Food diary').first()).toBeVisible()
  })

  test('primary tabs reach sessions and messages', async ({ clientPage: page }) => {
    test.setTimeout(60_000)
    await page.goto('/portal/sessions')
    await expect(page).toHaveURL(/\/portal\/sessions/)
    await page.goto('/portal/messages')
    await expect(page).toHaveURL(/\/portal\/messages/)
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible()
  })

  test('immersive workout log hides bottom nav', async ({ clientPage: page }) => {
    await page.goto('/portal/workouts')
    const startLink = page.getByRole('link', { name: /Start workout|Continue workout/i }).first()
    const hasWorkout = await startLink.isVisible().catch(() => false)
    if (!hasWorkout) {
      test.skip(true, 'No actionable workout for immersive log test')
    }
    await startLink.click()
    await expect(page).toHaveURL(/\/portal\/workouts\/[^/]+\/log/)
    await expect(page.getByRole('navigation')).toHaveCount(0)
  })

  test('custom keypad logs weight without native keyboard', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)

    try {
      await openPortalImmersiveWorkoutLog(page)
    } catch {
      test.skip(true, 'No actionable workout for keypad test')
    }

    const weightCell = page.getByRole('button', { name: /Set 1 weight/i }).first()
    const hasWeightField = await weightCell.isVisible().catch(() => false)
    if (!hasWeightField) {
      test.skip(true, 'No weight field on first exercise')
    }

    const initialViewportHeight = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight)

    await weightCell.click()
    const keypad = page.getByRole('group', { name: 'Workout entry keypad' })
    await expect(keypad).toBeVisible()

    const viewportAfterOpen = await page.evaluate(() => window.visualViewport?.height ?? window.innerHeight)
    expect(Math.abs(viewportAfterOpen - initialViewportHeight)).toBeLessThan(40)

    await keypad.getByRole('button', { name: 'Digit 2' }).click()
    await keypad.getByRole('button', { name: 'Digit 2' }).click()
    await keypad.getByRole('button', { name: 'Digit 5' }).click()
    await expect(weightCell).toHaveText('225')

    await keypad.getByRole('button', { name: 'Next field' }).click()
    await expect(page.getByRole('button', { name: /Set 1 reps/i })).toHaveAttribute(
      'aria-selected',
      'true'
    )

    await keypad.getByRole('button', { name: 'Hide keyboard' }).click()
    await expect(page.getByRole('group', { name: 'Workout entry keypad' })).toHaveCount(0)
  })
})

test.describe('Mobile smoke — coach dashboard', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('coach can use bottom nav to reach clients', async ({ coachPage: page }) => {
    await page.goto('/dashboard')
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL(/\/clients/)
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })
})
