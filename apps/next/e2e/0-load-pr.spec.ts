import { type Locator } from '@playwright/test'

import { test, expect, openPortalWorkoutForLogging } from './fixtures'

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

test.describe('PR tracking', () => {
  test('client completing a strong set surfaces PR feedback', async ({
    clientPage: page,
  }) => {
    test.setTimeout(60_000)

    await openPortalWorkoutForLogging(page)

    await page.getByRole('button', { name: /Log workout/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const startButton = dialog.getByRole('button', {
      name: /Start workout|Resume workout/i,
    })
    if (await startButton.isVisible()) {
      await startButton.click()
    }

    await dialog.getByLabel(/Set 1 weight/i).fill('225')
    await dialog.getByLabel(/Set 1 reps/i).fill('5')
    await ensureSetLogged(dialog, 1)

    await dialog.getByRole('button', { name: 'Complete workout' }).click()
    await expect(page.getByText(/New PR/i).first()).toBeVisible({ timeout: 15_000 })
    await expect(dialog.getByRole('button', { name: 'Reopen' })).toBeVisible({
      timeout: 15_000,
    })
  })
})
