import { type Locator } from '@playwright/test'

import { test, expect, E2E_WORKOUT_NAME, openPortalWorkoutForLogging } from './fixtures'

async function ensureSetLogged(dialog: Locator, setNumber: number) {
  const incompleteButton = dialog.getByRole('button', {
    name: `Confirm set ${setNumber}`,
  })
  const completeButton = dialog.getByRole('button', {
    name: `Mark set ${setNumber} incomplete`,
  })

  if (await completeButton.isVisible()) return

  if (await incompleteButton.isVisible()) {
    await incompleteButton.click()
    await expect(completeButton).toBeVisible({ timeout: 10_000 })
  }
}

test.describe('Client portal logging', () => {
  test('client sees portal dashboard with scheduled workout', async ({
    clientPage: page,
  }) => {
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible()
    await expect(
      page.getByRole('link', { name: new RegExp(`Today: ${E2E_WORKOUT_NAME}`) })
    ).toBeVisible({ timeout: 15_000 })
  })

  test('client can start and complete a workout', async ({ clientPage: page }) => {
    test.setTimeout(60_000)

    await openPortalWorkoutForLogging(page)

    const viewLogButton = page.getByRole('button', { name: /View log/i })
    if (await viewLogButton.isVisible()) {
      await viewLogButton.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByLabel(/Set 1 weight/i)).toBeEnabled({
        timeout: 15_000,
      })
      await dialog.getByRole('button', { name: 'Close' }).click()
      return
    }

    await page.getByRole('button', { name: /Log workout/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const startButton = dialog.getByRole('button', {
      name: /Start workout|Resume workout/i,
    })
    if (await startButton.isVisible()) {
      await startButton.click()
    }

    await expect(dialog.getByLabel(/Set 1 weight/i)).toBeEnabled({ timeout: 15_000 })
    await dialog.getByLabel(/Set 1 weight/i).fill('135')
    await dialog.getByLabel(/Set 1 reps/i).fill('10')
    await ensureSetLogged(dialog, 1)

    await expect(page.getByText(/Workout complete!/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(dialog.getByLabel(/Set 1 weight/i)).toBeEnabled()

    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByRole('button', { name: /View log/i })).toBeVisible({
      timeout: 15_000,
    })
  })
})
