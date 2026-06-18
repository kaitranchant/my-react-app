import { type Locator } from '@playwright/test'

import { test, expect, selectedDayWorkoutSummary } from './fixtures'

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
  test('client sees portal calendar with scheduled workout', async ({
    clientPage: page,
  }) => {
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible()
    await expect(selectedDayWorkoutSummary(page)).toBeVisible({
      timeout: 15_000,
    })
  })

  test('client can start and complete a workout', async ({ clientPage: page }) => {
    test.setTimeout(60_000)

    await expect(selectedDayWorkoutSummary(page)).toBeVisible({
      timeout: 15_000,
    })

    await page
      .getByRole('button', { name: /Log workout|Continue log/i })
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const startButton = dialog.getByRole('button', {
      name: /Start workout|Resume workout/i,
    })
    if (await startButton.isVisible()) {
      await startButton.click()
    }

    await dialog.getByLabel(/Set 1 weight/i).fill('135')
    await dialog.getByLabel(/Set 1 reps/i).fill('10')
    await ensureSetLogged(dialog, 1)

    await dialog.getByRole('button', { name: 'Complete workout' }).click()
    await expect(dialog.getByRole('button', { name: 'Reopen' })).toBeVisible({
      timeout: 15_000,
    })

    await dialog.getByRole('button', { name: 'Close' }).click()
    await expect(dialog).toBeHidden()

    await expect(page.getByRole('button', { name: /View log/i })).toBeVisible({
      timeout: 15_000,
    })
  })
})
